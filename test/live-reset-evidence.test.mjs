import test from 'node:test';
import assert from 'node:assert/strict';
import { collectLiveResetEvidence,normalizeResetFeed,readTiboTimeline,classifyExplicitResetPost,
  RESET_HISTORY_URL,RESET_STATUS_URL } from '../src/live-reset-evidence.js';
import { predictionFromArchive } from '../src/reset-forecast.js';
import { resetProbabilityByHours } from '../src/local-predictor.js';

// Suppressed windows keep about 5% of the usual rate: very unlikely, not impossible.
const veryUnlikely=(value,message)=>assert.ok(value>=0&&value<.05,message??`${value} 应很低`);

const now=new Date('2026-10-15T20:00:00Z');
const record=(id,at,type='regular')=>({id,reset_type:type,announced_at:at,
  text:type==='banked' ? 'A banked reset credit' : 'Codex usage limits have reset',
  source:{author:'thsottiaux',url:`https://x.com/thsottiaux/status/${id}`}});
const feed={data:[record('4','2026-10-15T06:00:00Z'),record('3','2026-10-10T06:00:00Z'),
  record('2','2026-10-05T06:00:00Z'),record('1','2026-10-01T06:00:00Z'),
  record('5','2026-10-15T07:00:00Z','banked')]};
const response=data=>({ok:true,text:async()=>JSON.stringify(data)});
const notFound={ok:false,status:404,text:async()=>'{}'};

// Tibo posts beyond the Codex Resets records come only from the official X API.
const X_TOKEN='test-token',X_USER_ID='42';
const tweet=(id,createdAt,text,parentId)=>({id:String(id),text,created_at:createdAt,author_id:X_USER_ID,
  ...(parentId ? {referenced_tweets:[{type:'replied_to',id:String(parentId)}]} : {})});
const withX=(publicData,{tweets=[],parents=[],timeline=true}={})=>async (url,options)=>{
  const u=new URL(String(url));
  if(u.hostname!=='api.x.com')return response(publicData(String(url)));
  assert.equal(options.headers.authorization,`Bearer ${X_TOKEN}`);
  if(u.pathname==='/2/users/by/username/thsottiaux')return response({data:{id:X_USER_ID}});
  if(timeline && u.pathname===`/2/users/${X_USER_ID}/tweets`)return response({data:tweets,includes:{tweets:parents}});
  return notFound;
};

test('明确语句回退不把否定和猜测升级成重置承诺',()=>{
  const post=text=>classifyExplicitResetPost({text,createdAt:'2026-10-15T18:00:00Z'}).signal.kind;
  assert.equal(post('We will not reset Codex usage tomorrow'),'unknown');
  assert.equal(post('Maybe we reset Codex usage tomorrow'),'reset_hint');
  assert.equal(post('We will reset Codex usage tomorrow'),'reset_planned');
});

test('实时历史保留类型与原帖，未来、未知类型和非Tibo帖子不能进入记录',()=>{
  const result=normalizeResetFeed({data:[...feed.data,record('6','2026-10-16T06:00:00Z'),
    record('7','2026-10-14T06:00:00Z','unknown'),
    {...record('8','2026-10-14T06:00:00Z'),source:{url:'https://example.test/status/8'}}]},now);
  assert.equal(result.length,5);
  assert.equal(result.filter(event=>event.kind==='automatic').length,4);
  assert.equal(result.at(-1).kind,'banked');
});

test('每次运行刷新证据，但忽略外部 likelihood；X抓取失败不能解释为没有消息',async()=>{
  const requests=[];
  const publicData=url=>url===RESET_HISTORY_URL ? feed
    : {data:{latest_reset:feed.data[0]},forecast:{likelihood:1}};
  const fetchImpl=async (url,options)=>{
    requests.push(String(url));
    return withX(publicData,{timeline:false})(url,options);
  };
  const first=await collectLiveResetEvidence({now,fetchImpl,classifyWithLLM:false,xBearerToken:null});
  const second=await collectLiveResetEvidence({now,fetchImpl,classifyWithLLM:false,xBearerToken:null});
  assert.equal(requests.length,4);
  assert.deepEqual(requests.slice(0,2),[RESET_HISTORY_URL,RESET_STATUS_URL]);
  assert.equal(first.coverage.history.status,'live');
  assert.equal(first.coverage.social.status,'unavailable');
  assert.equal(first.coverage.social.fullTimeline,false);
  requests.length=0;
  const xDown=await collectLiveResetEvidence({now,fetchImpl,classifyWithLLM:false,xBearerToken:X_TOKEN});
  assert.ok(requests.some(url=>new URL(url).pathname===`/2/users/${X_USER_ID}/tweets`));
  assert.equal(xDown.coverage.social.status,'unavailable');
  assert.match(xDown.coverage.social.reason,/X 官方接口不可用/);
  assert.deepEqual(xDown.events,first.events);
  assert.equal(first.lastResetAt,'2026-10-15T06:00:00.000Z');
  assert.equal(first.daysSinceReset,14/24);
  const forecast=predictionFromArchive({archive:first,now,timeZone:'Europe/Berlin'});
  assert.ok(forecast.prediction.next48Probability<1);
  assert.deepEqual(first.events,second.events);
});

test('标准LLM分析回复及其上下文，缓存分类但不缓存抓取；密钥不进入输出',async()=>{
  const cache=new Map();
  let llmCalls=0;
  const post={link:'https://x.com/thsottiaux/status/9',
    context:'Will Codex usage limits reset tomorrow?'};
  let timelineFetches=0;
  const xFetch=withX(url=>url===RESET_HISTORY_URL ? feed : {data:{}},{
    tweets:[tweet(9,'2026-10-15T19:00:00Z','Yes, tomorrow.',8)],parents:[{id:'8',text:post.context}]});
  const fetchImpl=async (url,options)=>{
    if(new URL(String(url)).pathname.endsWith('/tweets'))timelineFetches++;
    return xFetch(url,options);
  };
  const llm={model:'test-model',apiKey:'never-output-this-key',baseUrl:'https://llm.example.test/v1',
    fetchImpl:async (url,options)=>{
      llmCalls++;
      const body=JSON.parse(options.body),data=JSON.parse(body.messages[1].content);
      assert.equal(data.context,post.context);
      assert.equal(data.activityType,'reply');
      return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({kind:'reset_planned',
        confidence:.9,validUntil:'2026-10-16T23:00:00Z'})}}]})};
    }};
  const first=await collectLiveResetEvidence({now,fetchImpl,llm,classificationCache:cache,xBearerToken:X_TOKEN});
  const second=await collectLiveResetEvidence({now,fetchImpl,llm,classificationCache:cache,xBearerToken:X_TOKEN});
  assert.equal(llmCalls,1);
  assert.equal(timelineFetches,2,'抓取每次都刷新');
  assert.equal(first.coverage.social.status,'direct');
  assert.equal(first.coverage.social.url,'https://api.x.com/2/users/:id/tweets');
  assert.equal(first.classification,'llm');
  assert.equal(second.classification,'llm');
  assert.equal(first.posts.find(item=>item.activityType==='reply').signal.kind,'reset_planned');
  assert.equal(first.latestResetMention.sourceUrl,post.link);
  assert.equal(first.latestResetMention.context,post.context);
  assert.doesNotMatch(JSON.stringify(first),/never-output-this-key|test-token/);
  const prediction=predictionFromArchive({archive:first,now,timeZone:'Europe/Berlin',enforceResetCooldown:true}).prediction;
  veryUnlikely(prediction.todayProbability,'开启次日冷却时，明确预告也不能提前放开');
  const historyOnly=predictionFromArchive({archive:{...first,posts:[]},now,timeZone:'Europe/Berlin',enforceResetCooldown:true}).prediction;
  assert.ok(prediction.next48Probability>historyOnly.next48Probability,'回复分类真正进入概率计算');
  assert.equal(prediction.evidence.latestResetMention.sourceUrl,post.link);
});

test('相关回复不能被八条新闲聊挤掉，父帖语境进入LLM但含糊回复不变成承诺',async()=>{
  const reply={link:'https://x.com/thsottiaux/status/80',title:'Let us break that cycle.',
    context:'We miss the Codex usage reset days.'};
  const chat=Array.from({length:10},(_,i)=>tweet(100+i,`2026-10-15T19:${String(i).padStart(2,'0')}:00Z`,'Hello there.'));
  const seen=[];
  const result=await collectLiveResetEvidence({now,xBearerToken:X_TOKEN,fetchImpl:withX(
    url=>url===RESET_HISTORY_URL ? feed : {data:{}},{tweets:[...chat,tweet(80,'2026-10-15T17:00:00Z',reply.title,79)],
      parents:[{id:'79',text:reply.context}]}),
    llm:{model:'test-model',baseUrl:'https://llm.example.test/v1',fetchImpl:async (url,options)=>{
      seen.push(JSON.parse(JSON.parse(options.body).messages[1].content));
      return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({kind:'unknown',confidence:.5})}}]})};
    }}});
  assert.equal(result.posts.length,8);
  assert.equal(seen[0].text,reply.title);
  assert.equal(seen[0].context,reply.context);
  assert.equal(result.latestResetMention.sourceUrl,reply.link);
  assert.equal(result.latestResetMention.signal.kind,'unknown');
  assert.equal(result.latestResetMention.activityType,'reply');
  const withPost=predictionFromArchive({archive:result,now,timeZone:'Europe/Berlin'}).prediction;
  const withoutPost=predictionFromArchive({archive:{...result,posts:[]},now,timeZone:'Europe/Berlin'}).prediction;
  assert.equal(withPost.next48Probability,withoutPost.next48Probability,'unknown不强行提高预测');
});

test('历史网络失败时保持原缓存日期，不伪装成本次已更新',async()=>{
  const fallbackArchive={retrievedAt:'2026-10-12',events:normalizeResetFeed(feed,new Date('2026-10-12T20:00:00Z'))};
  const result=await collectLiveResetEvidence({now,fallbackArchive,xBearerToken:null,
    fetchImpl:async()=>{throw new Error('offline');}});
  assert.equal(result.retrievedAt,'2026-10-12');
  assert.equal(result.coverage.history.status,'cached');
  assert.equal(result.coverage.social.status,'unavailable');
  assert.deepEqual(result.coverage.errors.map(error=>error.url),[RESET_HISTORY_URL,RESET_STATUS_URL]);
});

test('同一小时发放备用不能吞掉随后明确完成的直接重置',async()=>{
  const result=await collectLiveResetEvidence({now,classifyWithLLM:false,xBearerToken:X_TOKEN,fetchImpl:withX(
    url=>url===RESET_HISTORY_URL ? feed : {data:{}},
    {tweets:[tweet(99,'2026-10-15T07:10:00Z','We have reset Codex usage limits.')]})});
  assert.equal(result.lastResetAt,'2026-10-15T07:10:00.000Z');
  assert.equal(predictionFromArchive({archive:result,now,timeZone:'Europe/Berlin'}).available,true);
});

test('可选X官方时间线保留回复并展开父帖，令牌仅发给X接口',async()=>{
  const calls=[];
  const posts=await readTiboTimeline({now,bearerToken:'x-secret',fetchImpl:async (url,options)=>{
    const u=new URL(url);calls.push(u);
    assert.equal(u.hostname,'api.x.com');
    assert.equal(options.headers.authorization,'Bearer x-secret');
    if(u.pathname.includes('/by/username/'))return response({data:{id:'123'}});
    assert.equal(u.searchParams.get('exclude'),'retweets');
    return response({data:[{id:'9',text:'Yes, tomorrow.',created_at:'2026-10-15T19:00:00Z',
      referenced_tweets:[{type:'replied_to',id:'8'}]}],includes:{tweets:[{id:'8',text:'Codex reset?'}]}});
  }});
  assert.equal(calls.length,2);
  assert.equal(posts[0].activityType,'reply');
  assert.equal(posts[0].context,'Codex reset?');
  assert.doesNotMatch(JSON.stringify(posts),/x-secret/);
});

test('采集链路使用真实事件时间入库，JSON代码块可进入预测；历史误报不能入库',async()=>{
  const posts=[
    tweet(501,'2026-10-15T19:00:00Z','We reset Codex usage at 2026-10-15T18:00:00Z. The reset is complete.'),
    tweet(502,'2026-10-15T19:30:00Z','We reset Codex usage last week. No new reset is being announced.')
  ];
  const archive=await collectLiveResetEvidence({now,xBearerToken:X_TOKEN,fetchImpl:withX(
    url=>url===RESET_HISTORY_URL ? feed : {data:{}},{tweets:posts}),
    llm:{model:'claude-haiku-5-5',baseUrl:'https://llm.example.test/v1',fetchImpl:async(_url,options)=>{
      const p=JSON.parse(JSON.parse(options.body).messages[1].content);
      const signal={kind:'reset_completed',confidence:.95,resetTiming:'current',
        resetOccurredAt:p.text.includes('18:00') ? '2026-10-15T18:00:00Z' : null};
      return {ok:true,json:async()=>({choices:[{message:{content:`\`\`\`json\n${JSON.stringify(signal)}\n\`\`\``}}]})};
    }}});
  assert.equal(archive.classification,'llm');
  assert.equal(archive.classificationModel,'claude-haiku-5-5');
  assert.equal(archive.lastResetAt,'2026-10-15T18:00:00.000Z');
  const added=archive.events.filter(e=>['501','502'].some(id=>e.sourceUrl.endsWith('/'+id)));
  assert.equal(added.length,1);
  assert.equal(added[0].reportedAt,'2026-10-15T19:00:00.000Z');
  assert.equal(added[0].timeBasis,'explicit');
  assert.equal(archive.posts.find(p=>p.sourceUrl.endsWith('/502')).signal.kind,'unknown');
  const prediction=predictionFromArchive({archive,now,timeZone:'Europe/Berlin',enforceResetCooldown:true});
  assert.equal(prediction.available,true);
  assert.equal(prediction.prediction.evidence.hardRules.find(r=>r.kind==='reset-next-day-cooldown').lastResetAt,
    '2026-10-15T18:00:00.000Z');
});

test('Codex Resets 已宣布的 reset：按确定事件处理，过了时间就当已发生',async()=>{
  const at=new Date('2026-10-22T08:44:00Z');
  const history={data:[record('4','2026-10-20T06:33:48Z'),record('3','2026-10-14T06:00:00Z'),
    record('2','2026-10-08T06:00:00Z'),record('1','2026-10-02T06:00:00Z')]};
  const scheduled={id:'9',status:'scheduled',reset_type:'regular',announced_at:'2026-10-22T06:55:54Z',
    scheduled_for:'2026-10-22T17:00:00Z',text:'Lands tomorrow before 10am PST.',
    source:{type:'x_post',author:'thsottiaux',url:'https://x.com/thsottiaux/status/9'}};
  const fetchImpl=async url=>response(String(url)===RESET_HISTORY_URL ? history
    : {data:{latest_reset:history.data[0],scheduled_reset:scheduled,active_watch:null}});
  const archive=await collectLiveResetEvidence({now:at,fetchImpl,classifyWithLLM:false,xBearerToken:null});
  const post=archive.posts.find(post=>post.sourceUrl.endsWith('/9'));
  assert.equal(post.signal.kind,'reset_planned');
  assert.equal(post.signal.scheduledFor,'2026-10-22T17:00:00.000Z');
  const result=predictionFromArchive({archive,now:at,timeZone:'UTC'});
  const hours=(Date.parse(scheduled.scheduled_for)-at.getTime())/3_600_000;
  assert.equal(result.prediction.evidence.scheduledResetAt,'2026-10-22T17:00:00.000Z');
  // Nearly all mass in the last quarter hour before the announced time.
  assert.ok(resetProbabilityByHours(result.prediction,hours-.25)<.05);
  assert.ok(Math.abs(resetProbabilityByHours(result.prediction,hours)-.99)<.002);
  // Once the time passes without a public record, it counts as the last reset.
  const later=predictionFromArchive({archive,now:new Date('2026-10-22T21:00:00Z'),timeZone:'UTC'});
  assert.equal(later.prediction.evidence.scheduledResetAt,null);
  assert.equal(later.lastResetAt,'2026-10-22T17:00:00.000Z');
  assert.equal(later.lastResetSource,'https://x.com/thsottiaux/status/9');
  // The forecast restarts its clock from the landed reset.
  assert.ok(Math.abs(later.daysSinceReset-4/24)<1e-9);
  assert.ok(Math.abs(later.prediction.evidence.daysSinceReset-4/24)<1e-9);
  // Landed early and already recorded: never counted twice.
  const early=record('10','2026-10-22T15:00:00Z');
  const recorded=await collectLiveResetEvidence({now:new Date('2026-10-22T21:00:00Z'),classifyWithLLM:false,xBearerToken:null,
    fetchImpl:async url=>response(String(url)===RESET_HISTORY_URL ? {data:[early,...history.data]}
      : {data:{latest_reset:early,scheduled_reset:scheduled,active_watch:null}})});
  const once=predictionFromArchive({archive:recorded,now:new Date('2026-10-22T21:00:00Z'),timeZone:'UTC'});
  assert.equal(once.lastResetAt,'2026-10-22T15:00:00.000Z');
  // Recorded on time: the plan is identical to having no announcement at all.
  const onTime=record('11','2026-10-22T17:00:00Z');
  const confirmed=await collectLiveResetEvidence({now:new Date('2026-10-22T21:00:00Z'),classifyWithLLM:false,xBearerToken:null,
    fetchImpl:async url=>response(String(url)===RESET_HISTORY_URL ? {data:[onTime,...history.data]}
      : {data:{latest_reset:onTime,scheduled_reset:null,active_watch:null}})});
  const plain=predictionFromArchive({archive:confirmed,now:new Date('2026-10-22T21:00:00Z'),timeZone:'UTC'});
  assert.equal(plain.lastResetAt,'2026-10-22T17:00:00.000Z');
  assert.ok(Math.abs(plain.prediction.next48Probability-later.prediction.next48Probability)<.02);
});
