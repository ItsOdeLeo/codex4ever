import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { planUsagePath } from '../src/usage-path-planner.js';
import { predictionFromArchive } from '../src/reset-forecast.js';
import { publicResetScenarios,simulateResetPolicy } from '../src/reset-policy-search.js';
import { layoutStrategyTree,renderStrategyTree } from '../src/strategy-tree-layout.js';
import { predictReset } from '../src/local-predictor.js';

process.env.TZ='Europe/Berlin';

const now=new Date('2026-10-18T12:00:00Z'),HOUR=3600000,timeZone='Europe/Berlin';
const input={weeklyRemaining:83,weeklyResetDays:6,weeklyResetHours:0,resetDates:['2026-11-07']};
const archive=JSON.parse(await readFile(new URL('./fixtures/reset-events-2026-10-13.json',import.meta.url),'utf8'));
const {prediction}=predictionFromArchive({archive,now,timeZone});
const solve=forecast=>planUsagePath({input,now,timeZone,prediction:forecast,paceMultiplier:2});
const state={now:now.toISOString(),remainingPercent:83,normalResetInHours:144,averagePercentPerDay:17,
  resets:[{expiresOn:'2026-11-07',expiresAt:'2026-11-07T23:00:00Z',expiresInHours:491}]};
const near=(a,b,message)=>assert.ok(Math.abs(a-b)<1e-6,message??`${a} != ${b}`);
const localDay=stamp=>new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'})
  .format(new Date(stamp));

test('截图结果回归：83%、6天、34%/天、11月7日备用，主动保留而非21日兑换',()=>{
  const result=solve(prediction);
  const forecast=publicResetScenarios({prediction,now:now.toISOString()});
  const oldCandidate=simulateResetPolicy({base:state,policy:{quantile:null,waitHours:0,useExpiring:false,bankMode:'bridge'},
    scenario:{events:[]},forecast,targetDailyPercent:34,stopAtFirstNormal:true});
  assert.equal(localDay(oldCandidate.events.find(event=>event.kind==='backup').at),'2026-10-21',
    '同一预测、同一输入下，旧候选确实在21日用备用');
  // Conservative assumed times leave a real outage after the second reset.
  // The single bank is spent only on that outage, never early on the 21st.
  assert.ok(result.recommendation.firstAction.dailyPercent>=34);
  assert.ok(result.recommendation.firstAction.dailyPercent<=68);
  assert.equal(result.strategy.plottedBranch,'predicted-extra-resets-first');
  assert.equal(result.forecastScenario.selected,true);
  assert.equal(result.forecastScenario.secondSelected,true);
  const supplies=result.milestones.points.flatMap(point=>point.events);
  const predicted=supplies.filter(event=>event.kind==='assumed-extra-reset');
  assert.deepEqual(predicted.map(event=>event.at),result.recommendation.primary.assumedResetTimes);
  assert.ok(Date.parse(predicted[0].at)>Date.parse(prediction.resetTimeMode.pointAt),'假设放在保守时间，而非最可能的小时');
  const banks=supplies.filter(event=>event.kind==='backup');
  for(const bank of banks) {
    near(bank.overwrittenPercent,0,'唯一的备用只在断供时使用');
    assert.notEqual(localDay(bank.at),'2026-10-21');
    assert.ok(bank.atHours>Date.parse(predicted[1].at)/HOUR-now.getTime()/HOUR,'两次假设的 reset 之间不动用备用');
  }
  const chosen=result.recommendation.selected;
  const earlier=result.recommendation.candidates.find(candidate=>candidate.policy.quantile===null
    &&candidate.policy.waitHours===0&&!candidate.policy.useExpiring&&candidate.policy.bankMode==='bridge');
  assert.ok(chosen.expected.utility>earlier.expected.utility);
  assert.ok(chosen.expected.bankOptionLost<earlier.expected.bankOptionLost);
  const html=renderStrategyTree(layoutStrategyTree(result,{prediction,locale:'en'}),String);
  assert.doesNotMatch(html,/data-node-id="held:0"|Keep banked reset|NaN|undefined/);
  assert.ok(result.recommendation.fallback.segments.some(segment=>segment.kind==='pause'));
});

test('按两次预测时刻实际发生时，推荐策略在两次之间保住备用；预测全落空仍有后路',()=>{
  const result=solve(prediction),forecast=publicResetScenarios({prediction,now:now.toISOString()});
  const times=[prediction.resetTimeMode.pointAt,prediction.followingResetEstimate.pointAt]
    .map(at=>(Date.parse(at)-now.getTime())/HOUR);
  const trace=simulateResetPolicy({base:state,policy:result.recommendation.selected.policy,
    scenario:{events:times},forecast,targetDailyPercent:34});
  assert.equal(trace.events.filter(event=>event.kind==='public-reset').length,2);
  assert.equal(trace.events.filter(event=>event.kind==='backup'&&event.atHours<=times[1]).length,0);
  // If no reset arrives, the single bank is the fallback: spent only once quota is gone.
  for(const event of result.recommendation.fallback.events.filter(event=>event.kind==='backup'))
    near(event.overwrittenPercent,0,'预测落空时，备用只在额度用完后补上');
});

test('备用被随后的公开重置覆盖时损失进入评分，已到期备用的抢救不会被惩罚',()=>{
  const forecast=publicResetScenarios({prediction:null,now:now.toISOString()});
  const simulate=(waitHours,expiresInHours)=>simulateResetPolicy({
    base:{...state,remainingPercent:0,resets:[{...state.resets[0],expiresInHours}]},
    policy:{quantile:null,waitHours,useExpiring:false},scenario:{events:[6]},forecast,targetDailyPercent:34});
  const immediate=simulate(0,491),waiting=simulate(12,491);
  assert.ok(immediate.bankOptionLost>80);
  assert.ok(waiting.bankOptionLost<immediate.bankOptionLost);
  assert.ok(waiting.utility>immediate.utility);
  const salvage=simulate(0,5),missed=simulate(12,5);
  assert.equal(salvage.bankOptionLost,0,'银行额度本来就会在公开重置之前到期，没有可保留的未来价值');
  assert.ok(salvage.utility>missed.utility);
});

test('没有额外 reset 机会时仍可21日用备用，没有硬编码日期禁令',()=>{
  const result=solve(null);
  assert.equal(localDay(result.backupChoices.find(choice=>choice.used).at),'2026-10-21');
  assert.equal(result.recommendation.firstAction.dailyPercent,34);
  assert.equal(result.recommendation.firstAction.bankWaitHours,0);
});

test('真实网页刷新默认纳入两次假设、按当前用量规划且保留备用；取消和重算也检查',async()=>{
  const originals={document:globalThis.document,Date:globalThis.Date,fetch:globalThis.fetch,
    localStorage:globalThis.localStorage,ResizeObserver:globalThis.ResizeObserver};
  const NativeDate=originals.Date;
  globalThis.Date=class extends NativeDate {
    constructor(...args){super(...(args.length ? args : [now.toISOString()]));}
    static now(){return now.getTime();}
  };
  const elements=new Map();
  const element=selector=>{
    if(!elements.has(selector))elements.set(selector,{innerHTML:'',textContent:'',hidden:false,clientWidth:1920,
      listeners:{},classList:{add(){},remove(){}},contains:()=>true,setAttribute(){},
      addEventListener(name,handler){this.listeners[name]=handler;}});
    return elements.get(selector);
  };
  globalThis.document={querySelector:element};
  globalThis.ResizeObserver=undefined;
  globalThis.localStorage={getItem:key=>key==='usage-planner-language' ? 'en'
    : JSON.stringify({...input,currentPhasePace:1}),setItem(){}};
  let fetches=0;
  globalThis.fetch=async()=>{fetches++;return {ok:true,json:async()=>structuredClone(archive)};};
  try {
    await import('../src/web.js?banked-reservation-output-regression');
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(element('#error').hidden,true,element('#error').textContent);
    const output=element('#result').innerHTML;
    assert.match(output,/data-policy-search="scenario-based-rolling-policy-search"/);
    assert.doesNotMatch(output,/data-node-id="backup:0"/);
    assert.doesNotMatch(output,/data-node-id="held:0"|Keep banked reset/);
    assert.match(output,/data-banked-count="1">Banked resets · 1/);
    const firstRate=Number(output.match(/data-phase-daily="([\d.]+)"/)?.[1]);
    // Keep pace (the default) shows the current pace; assumed resets refill but never retarget it.
    assert.equal(firstRate,17);
    const refills=()=>[...element('#result').innerHTML.matchAll(/data-refill-sequence="[12]"/g)].length;
    assert.equal(refills(),2,'用户打开页面就应看到两次假设已经参与规划');
    assert.doesNotMatch(output,/Assuming no extra reset/);
    assert.doesNotMatch(element('#result').innerHTML+element('#strategy-controls').innerHTML,/data-usage-slider/,'页面不再提供用量滑块');
    assert.equal(fetches,1,'规划不重新抓取预测');
    const click=(selector,dataset)=>element('#result').listeners.click({target:{closest:query=>query===selector ? {dataset} : null}});
    click('[data-assume-reset]',{assumptionSequence:'1'});
    assert.equal(refills(),0,'自动选中状态要同步，第一次点击就是取消，而非重新启用');
    click('[data-assume-reset]',{assumptionSequence:'2'});
    assert.equal(refills(),2,'选择第二次即重新计入两次假设，仍是同一算法');
    assert.doesNotMatch(element('#result').innerHTML,/data-node-id="backup:0"/);
    await element('#calculate').listeners.click();
    assert.equal(refills(),2,'Calculate 也必须使用同一算法入口');
    assert.doesNotMatch(element('#result').innerHTML,/data-node-id="backup:0"/);
  } finally {
    for(const [key,value] of Object.entries(originals)) {
      if(value===undefined)delete globalThis[key];else globalThis[key]=value;
    }
  }
});

test('保持当前用量：免费供给有余量时保留备用；需求明显增大后才选择备用桥接',()=>{
  const plan=rate=>planUsagePath({input,now,timeZone,prediction,averagePercentPerDay:rate});
  const enough=plan(17),short=plan(100);
  assert.equal(enough.recommendation.firstAction.dailyPercent,17,'保持当前用量不为了赶上假设的重置而加量');
  assert.equal(short.recommendation.firstAction.dailyPercent,100,'保持当前用量不为了等待重置而减速');
  assert.equal(enough.recommendation.firstAction.backupPolicy,'reserve');
  assert.ok(enough.backupChoices.every(choice=>!choice.used));
  assert.equal(short.recommendation.firstAction.backupPolicy,'bridge');
  assert.ok(short.backupChoices.some(choice=>choice.used));
  assert.ok(short.recommendation.selected.expected.nearTermPauseHours
    <=short.recommendation.candidates.find(item=>item.policy.bankMode==='reserve'
      &&item.policy.quantile===short.recommendation.selected.policy.quantile&&!item.policy.useExpiring).expected.nearTermPauseHours);
});

test('每三天重置的历史：当前用量17%/天，保持该用量并保留备用',()=>{
  const resetTimes=Array.from({length:21},(_,index)=>new Date(now.getTime()-(1+index*3)*24*HOUR).toISOString()).reverse();
  const regular=predictReset({now:now.toISOString(),timeZone,campaignTimeZone:'America/Los_Angeles',resetTimes});
  assert.ok(Math.abs(regular.evidence.intervalModel.meanIntervalDays-3)<.01);
  const enough=planUsagePath({input,now,timeZone,prediction:regular});
  assert.equal(enough.recommendation.firstAction.dailyPercent,17);
  assert.equal(enough.recommendation.firstAction.backupPolicy,'reserve');
  assert.ok(enough.backupChoices.every(choice=>!choice.used));
  assert.ok(enough.recommendation.candidates.some(candidate=>candidate.policy.bankMode==='reserve'));
});

test('覆盖用量时临期也不擅自兑换；用户明确指定仍能使用',()=>{
  const args={input:{...input,resetDates:['2026-10-18']},now,timeZone,prediction};
  const automatic=planUsagePath(args);
  assert.ok(automatic.backupChoices.every(choice=>!choice.used));
  const result=planUsagePath({...args,requiredResetIndices:[0]});
  const bank=result.backupChoices.find(choice=>choice.used);
  assert.ok(bank);
  assert.ok(bank.atHours<result.resets[bank.index].expiresInHours);
  assert.equal(result.recommendation.fallback.expiredUnused,0);
});

test('库存越少，同一次兑换的稀缺成本越高；覆盖用量的铁律不随库存数量改变',()=>{
  const forecast=publicResetScenarios({prediction:null,now:now.toISOString(),horizonHours:24});
  const costs=[1,2,3].map(count=>simulateResetPolicy({
    base:{...state,remainingPercent:0,resets:Array.from({length:count},()=>({...state.resets[0]}))},
    policy:{quantile:null,bankMode:'bridge',waitHours:0,useExpiring:false},
    scenario:{events:[1]},forecast,targetDailyPercent:17}).bankReserveSpent);
  assert.ok(costs[0]>costs[1]&&costs[1]>costs[2]);
  for(const count of [0,1,2,3]) {
    const result=planUsagePath({input:{...input,resetDates:['2026-11-07','2026-11-08','2026-11-09'].slice(0,count)},
      now,timeZone,prediction});
    assert.equal(result.forecastScenario.secondSelected,true);
    assert.ok(result.backupChoices.every(choice=>!choice.used));
  }
});
