import test from 'node:test';
import assert from 'node:assert/strict';
import { predictReset,resetProbabilityByHours } from '../src/local-predictor.js';
import { collectLiveResetEvidence,classifyExplicitResetPost,RESET_HISTORY_URL,RESET_STATUS_URL } from '../src/live-reset-evidence.js';
import { predictionFromArchive } from '../src/reset-forecast.js';

// Suppressed windows keep about 5% of the usual rate: very unlikely, not impossible.
const veryUnlikely=(value,message)=>assert.ok(value>=0&&value<.05,message??`${value} 应很低`);

const history=['2026-07-01','2026-08-01','2026-09-01','2026-09-28','2026-10-01',
  '2026-10-04','2026-10-07','2026-10-10','2026-10-13'].map(day=>`${day}T08:00:00Z`);
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
const now='2026-10-16T20:00:00Z';
const feature={text:'Day 12/\nWe shipped a new feature.',createdAt:'2026-10-16T17:00:00Z',
  sourceUrl:'https://x.com/thsottiaux/status/12',signal:{kind:'new_feature',confidence:.95}};
const historyFeed={data:history.map((at,i)=>({id:i,reset_type:'regular',announced_at:at,text:'Codex usage reset',source:{url:`https://x.com/thsottiaux/status/${100+i}`}}))};
const json=data=>({ok:true,text:async()=>JSON.stringify(data)});
// Tibo posts beyond the Codex Resets records come only from the official X API.
const X_TOKEN='test-token',X_USER_ID='42';
const tweet=(id,createdAt,text,parentId)=>({id:String(id),text,created_at:createdAt,author_id:X_USER_ID,
  ...(parentId ? {referenced_tweets:[{type:'replied_to',id:String(parentId)}]} : {})});
const withX=(publicData,{tweets=[],parents=[]}={})=>async (url,options)=>{
  const u=new URL(String(url));
  if(u.hostname!=='api.x.com')return json(publicData(String(url)));
  assert.equal(options.headers.authorization,`Bearer ${X_TOKEN}`);
  if(u.pathname==='/2/users/by/username/thsottiaux')return json({data:{id:X_USER_ID}});
  if(u.pathname===`/2/users/${X_USER_ID}/tweets`)return json({data:tweets,includes:{tweets:parents}});
  return {ok:false,status:404,text:async()=>'{}'};
};
const predict=extra=>predictReset({now,timeZone:'Europe/Berlin',campaignTimeZone:'America/Los_Angeles',resetTimes:history,...extra});

test('最近一个月三天一次主导均值，过去慢频率只保留作参考',()=>{
  const p=predict(),m=p.evidence.intervalModel;
  assert.equal(m.source,'recent-30-day-intervals');
  assert.equal(m.meanIntervalDays,3);
  assert.equal(m.recentIntervalCount,5);
  assert.ok(m.historicalMeanIntervalDays>10);
  assert.equal(m.meanIntervalConfidence.sampleCount,5);
  assert.equal(m.meanIntervalConfidence.level,.95);
  assert.ok(Date.parse(p.nextResetWindow.from)>Date.parse(now));
  assert.ok(Date.parse(p.nextResetWindow.to)>Date.parse(p.nextResetWindow.from));
});

test('近期只有一个完整间隔仍以近期为主，但不编造均值置信区间',()=>{
  const p=predict({now:'2026-10-05T12:00:00Z',resetTimes:['2026-07-01','2026-08-01','2026-09-01','2026-09-30','2026-10-03'].map(d=>`${d}T08:00:00Z`)});
  assert.equal(p.evidence.intervalModel.meanIntervalDays,3);
  assert.equal(p.evidence.intervalModel.meanIntervalConfidence,null);
});

test('刚reset当天及次日概率极低，冷却解除后再按已等待时间计算',()=>{
  const early=predict({now:'2026-10-13T12:00:00Z',timeZone:'UTC'});
  const later=predict({now:'2026-10-15T12:00:00Z',timeZone:'UTC'});
  veryUnlikely(early.todayProbability);
  assert.ok(resetProbabilityByHours(early,24)<resetProbabilityByHours(later,24));
  assert.equal(early.evidence.hardRules[0].kind,'reset-next-day-cooldown');
  assert.equal(early.evidence.hardRules[0].until,'2026-10-15T07:00:00.000Z');
});

test('Day功能帖当天概率极低，弱暗示和明确预告都不能冲掉指定硬规则',()=>{
  const hint={text:'Perhaps a Codex reset?',createdAt:'2026-10-16T18:00:00Z',signal:{kind:'reset_hint',confidence:1}};
  const promise={...hint,signal:{kind:'reset_planned',confidence:1,validUntil:'2026-10-17T06:00:00Z'}};
  const p=predict({posts:[feature,hint,promise]});
  veryUnlikely(p.todayProbability);
  assert.equal(p.timeZone,'America/Los_Angeles');
  assert.equal(p.displayTimeZone,'Europe/Berlin');
  assert.equal(p.evidence.hardRules[0].day,12);
  assert.equal(p.evidence.hardRules[0].until,'2026-10-17T07:00:00.000Z');
  assert.equal(p.evidence.hardRules[0].basis,'user-requested-hard-assumption');
  veryUnlikely(resetProbabilityByHours(p,10));
  assert.ok(resetProbabilityByHours(p,12)>0);
  const values=Array.from({length:241},(_,hour)=>resetProbabilityByHours(p,hour));
  assert.ok(values.every((value,index)=>value>=0 && value<=1 && (!index || value>=values[index-1])));
});

test('功能硬规则不延续到次日；普通功能帖或父帖Day编号不触发归零',()=>{
  const tomorrow='2026-10-17T08:00:00Z';
  const p=predict({now:tomorrow,posts:[feature]});
  const base=predict({now:tomorrow});
  assert.ok(p.todayProbability>0);
  assert.equal(p.evidence.hardRules.length,0);
  near(resetProbabilityByHours(p,24),resetProbabilityByHours(base,24));
  const ordinary=predict({posts:[{...feature,text:'We shipped a new feature.',context:'Day 12/'}]});
  assert.ok(ordinary.todayProbability>0);
  assert.equal(ordinary.evidence.hardRules.length,0);
});

test('明确预告在日内到期后停止加成；极低先验不虚构一年内的预测窗口',()=>{
  const args={now:'2026-10-16T12:00:00Z',timeZone:'UTC',priorDailyProbability:.1};
  const base=predictReset(args),boost=predictReset({...args,posts:[{text:'Codex reset in two hours.',createdAt:args.now,
    signal:{kind:'reset_planned',confidence:1,validUntil:'2026-10-16T14:00:00Z'}}]});
  const f=hours=>resetProbabilityByHours(boost,hours),g=hours=>resetProbabilityByHours(base,hours);
  assert.ok(f(2)>g(2));
  near((f(6)-f(2))/(1-f(2)),(g(6)-g(2))/(1-g(2)));
  const tiny=predictReset({...args,priorDailyProbability:1e-9});
  assert.equal(tiny.nextResetWindow.from,null);
  assert.equal(tiny.nextResetWindow.to,null);
});

test('状态API observed_at回复被接入且不覆盖父帖；Day功能/完成/备用明确分开',async()=>{
  assert.equal(classifyExplicitResetPost(feature).signal.kind,'new_feature');
  assert.equal(classifyExplicitResetPost({text:'Day 3/\nReset.',createdAt:now}).signal.kind,'reset_completed');
  assert.equal(classifyExplicitResetPost({text:'Day 3/\nA banked reset credit.',createdAt:now}).signal.kind,'banked_credit');
  const reply={observed_at:'2026-10-16T18:00:00Z',text:'Perhaps we reset Codex tomorrow.',
    source:{url:'https://x.com/thsottiaux/status/16'},reset_chance_percent:100,expires_at:'2026-10-16T19:00:00Z'};
  const archive=await collectLiveResetEvidence({now:new Date(now),classifyWithLLM:false,xBearerToken:X_TOKEN,
    fetchImpl:withX(url=>url===RESET_HISTORY_URL ? historyFeed : url===RESET_STATUS_URL ? {data:{active_watch:reply}} : {},{
      tweets:[tweet(12,feature.createdAt,feature.text),tweet(16,reply.observed_at,reply.text,15)],
      parents:[{id:'15',text:'Will Codex usage reset?'}]})});
  assert.equal(archive.coverage.social.status,'direct');
  assert.equal(archive.posts.find(post=>post.sourceUrl===feature.sourceUrl).signal.kind,'new_feature');
  const post=archive.posts.find(post=>post.sourceUrl===reply.source.url);
  assert.equal(post.context,'Will Codex usage reset?');
  assert.equal(post.activityType,'reply');
  assert.equal(post.signal.kind,'reset_hint','原站100%不当成承诺或复制为概率');
  const p=predictionFromArchive({archive,now:new Date(now),timeZone:'Europe/Berlin'}).prediction;
  veryUnlikely(p.todayProbability);
  assert.ok(p.next48Probability<1);
});

test('Day宣布reset先进入已完成历史，备用不会伪装成自动恢复',async()=>{
  const completed='2026-10-16T19:00:00Z';
  const archive=await collectLiveResetEvidence({now:new Date(now),classifyWithLLM:false,xBearerToken:X_TOKEN,
    fetchImpl:withX(url=>url===RESET_HISTORY_URL ? historyFeed : {data:{}},{
      tweets:[tweet(200,completed,'Day 12/\nReset.'),tweet(201,now,'Day 12/\nA banked reset credit.')]})});
  assert.equal(archive.lastResetAt,new Date(completed).toISOString());
  assert.equal(archive.lastResetSource,'https://x.com/thsottiaux/status/200');
  assert.ok(!archive.events.some(event=>event.sourceUrl==='https://x.com/thsottiaux/status/201'),'备用不进入自动恢复历史');
  const p=predictionFromArchive({archive,now:new Date(now),timeZone:'Europe/Berlin'}).prediction;
  veryUnlikely(p.todayProbability);
});
