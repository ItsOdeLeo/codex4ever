import test from 'node:test';
import assert from 'node:assert/strict';
import { publicResetScenarios,searchResetPolicies,simulateResetPolicy } from '../src/reset-policy-search.js';
import { planIntensityUsage } from '../src/intensity-plan.js';
import { planUsagePath } from '../src/usage-path-planner.js';
import { resetProbabilityByHours } from '../src/local-predictor.js';
import { layoutStrategyTree } from '../src/strategy-tree-layout.js';

const now=new Date('2026-10-18T12:00:00Z');
const input={weeklyRemaining:83,weeklyResetDays:6,weeklyResetHours:0,resetDates:['2026-11-07']};
const prediction={model:'test-provided-forecast',todayEndHours:24,todayProbability:0,laterGivenNoReset:.98,
  next48Probability:.98,resetTimeMode:{pointAt:'2026-10-20T00:00:00Z'},
  evidence:{dailyFrequency:.1,intervalModel:{meanIntervalDays:3}}};
const base=(rate=100)=>({...planIntensityUsage({input,now,timeZone:'UTC'}),averagePercentPerDay:rate,
  credits:{balance:0,allowed:false,bridge:null}});
const plan=extra=>planUsagePath({input,now,timeZone:'UTC',averagePercentPerDay:100,prediction,
  ...extra});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);

test('联合情景保留未发生尾部，第二次以实际首次事件重启，不把条件曲线当作两次必定发生',()=>{
  const snapshot=structuredClone(prediction);
  const first=publicResetScenarios({prediction,now:now.toISOString(),sampleCount:64});
  near(first.scenarios.reduce((sum,path)=>sum+path.weight,0),1);
  near(first.scenarios.filter(path=>!path.events.length).reduce((sum,path)=>sum+path.weight,0),
    1-resetProbabilityByHours(prediction,336));
  assert.ok(first.scenarios.some(path=>path.events.length===1));
  assert.ok(first.scenarios.some(path=>path.events.length>1));
  assert.ok(first.scenarios.every(path=>path.events.every((time,index)=>time>=24&&time<336
    &&(!index||time>path.events[index-1]))));
  assert.deepEqual(publicResetScenarios({prediction,now:now.toISOString()}).scenarios,first.scenarios);
  assert.deepEqual(prediction,snapshot);
});

test('高概率近期重置与关闭预测给出不同策略：保持用量但等待补给，备用从刚性兑换变成后备',()=>{
  const recommended=plan(),knownOnly=plan({prediction:null});
  // Keep pace never slows down for a forecast; the forecast changes only when the bank is used.
  assert.equal(recommended.recommendation.firstAction.dailyPercent,100);
  for(const segment of recommended.recommendation.primary.trace.segments.filter(segment=>segment.kind==='quota'))
    near(segment.dailyPercent,100);
  // Conservative assumed times may leave a gap to bridge; the bank is still used later than without a forecast.
  assert.equal(knownOnly.recommendation.firstAction.dailyPercent,100);
  assert.equal(knownOnly.recommendation.firstAction.bankWaitHours,0);
  assert.ok(recommended.recommendation.firstAction.bankWaitHours>0,'有高概率近期重置时先等待补给');
  assert.ok(recommended.backupChoices[0].atHours>knownOnly.backupChoices[0].atHours);
  assert.ok(recommended.recommendation.selected.expected.utility>=recommended.recommendation.baseline.expected.utility);
  assert.ok(recommended.recommendation.selected.expected.pauseHours<recommended.recommendation.baseline.expected.pauseHours);
  for(const event of recommended.recommendation.primary.trace.events.filter(event=>event.kind==='backup'))
    near(event.overwrittenPercent,0,'缺额桥接必须等额度耗尽');
  assert.equal(recommended.milestones.points.flatMap(point=>point.events)
    .filter(event=>event.kind==='assumed-extra-reset').length,2,'推荐主线明确按两次假设重置规划');
  assert.equal(recommended.strategy.conditional,true);
  assert.equal(recommended.recommendation.fallback.publicCount,0,'预测落空路径不补入假额度');
});

test('两次真的发生时按当前用量用到补给，备用只在耗尽并等待后才用；决策不偷看未来',()=>{
  const state=base(),search=searchResetPolicies({base:state,prediction,targetDailyPercent:100});
  const forecast=publicResetScenarios({prediction,now:state.now});
  const simulate=events=>simulateResetPolicy({base:state,policy:search.selected.policy,scenario:{events},
    forecast,targetDailyPercent:100});
  const happened=simulate([30,80]),missed=simulate([]);
  const {waitHours}=search.selected.policy;
  assert.ok(waitHours>0,'高概率近期重置时先等待，而不是一耗尽就兑换');
  // The first reset arrives during the wait, so the bank is not used before it.
  assert.equal(happened.events.filter(event=>event.kind==='backup'&&event.atHours<=30).length,0);
  assert.ok(missed.events.some(event=>event.kind==='backup'));
  for(const trace of [happened,missed]) {
    for(const segment of trace.segments.filter(segment=>segment.kind==='quota'))near(segment.dailyPercent,100);
    for(const bank of trace.events.filter(event=>event.kind==='backup')) {
      near(bank.overwrittenPercent,0,'备用不能提前消耗，只在额度用完后补上');
      const gap=trace.segments.find(segment=>segment.kind==='pause'&&Math.abs(segment.endHours-bank.atHours)<1e-6);
      assert.ok(gap,'兑换前必有一段耗尽等待');
      near(gap.endHours-gap.startHours,waitHours);
    }
  }
  assert.deepEqual(happened.segments.filter(segment=>segment.endHours<30),
    missed.segments.filter(segment=>segment.endHours<30),'首次公开事件之前无法知道未来会不会发布');
  for(const event of happened.events.filter(event=>event.kind!=='expiry'))
    near((Date.parse(event.nextNormalResetAt)-Date.parse(event.at))/3600000,168);
});

test('未发生路径按每段真实速度守恒，耗尽后零线；原正常刷新不能继承旧求解器的备用日期',()=>{
  const result=plan(),trace=result.recommendation.fallback;
  let used=0;
  for(const segment of trace.segments) {
    if(segment.kind==='pause') {near(segment.remainingBefore,0);near(segment.remainingAfter,0);continue;}
    const consumed=(segment.endHours-segment.startHours)*segment.dailyPercent/24;
    near(segment.remainingBefore-segment.remainingAfter,consumed);used+=consumed;
  }
  const refills=trace.events.filter(event=>event.kind==='backup');
  near(83+refills.length*100-refills.reduce((sum,event)=>sum+event.overwrittenPercent,0)-used,
    trace.events.find(event=>event.kind==='normal-refresh')?.overwrittenPercent??trace.remainingQuota);
  near(trace.normalHour,refills.at(-1).atHours+168);
  const primary=result.recommendation.primary.trace;
  const supplies=primary.events.filter(event=>event.kind!=='expiry');
  near(83+supplies.length*100-supplies.reduce((sum,event)=>sum+event.overwrittenPercent,0)-primary.work,
    primary.remainingQuota);
  near(result.normalResetInHours,primary.normalHour);
  const held=plan({heldResetIndices:[0]});
  near(held.recommendation.fallback.normalHour,144);
  assert.ok(!held.recommendation.fallback.events.some(event=>event.kind==='backup'));
  const graph=layoutStrategyTree(result,{prediction});
  for(const band of graph.funnel.bands.filter(band=>band.kind==='pause')) {
    near(band.startHalf,0);near(band.endHalf,0);
  }
});

test('临期备用和人工保留／指定约束在所有情景有效，用过的备用不能再计入到期未用',()=>{
  const state=base(20);
  state.resets=[{expiresInHours:12,expiresAt:'2026-10-19T00:00:00Z',expiresOn:'2026-10-18'}];
  const forecast=publicResetScenarios({prediction:null,now:state.now});
  const simulate=extra=>simulateResetPolicy({base:state,policy:{quantile:null,waitHours:24,useExpiring:true},
    scenario:{events:[]},forecast,targetDailyPercent:20,...extra});
  const used=simulate();
  assert.equal(used.banksUsed,1);assert.equal(used.expiredUnused,0);
  near(used.events.find(event=>event.kind==='backup').atHours,11);
  const held=simulate({heldResetIndices:[0]});assert.equal(held.banksUsed,0);assert.equal(held.expiredUnused,1);
  const required=simulate({requiredResetIndices:[0]});assert.equal(required.banksUsed,1);
});

test('同一评价时域和明确目标权重；64／128情景的建议方向一致，而非声称全局最优',()=>{
  const solve=sampleCount=>searchResetPolicies({base:base(),prediction,targetDailyPercent:100,sampleCount});
  const a=solve(64),b=solve(128);
  assert.equal(a.optimality,'best-of-enumerated-feedback-policies');
  assert.equal(a.calibrated,false);
  assert.equal(a.horizonHours,336);
  // Keep pace only searches bank choices; the pace is always the requested pace.
  for(const search of [a,b]) {
    assert.ok(search.candidates.every(candidate=>candidate.policy.quantile===null));
    assert.equal(search.firstAction.dailyPercent,100);
  }
  assert.equal(a.selected.policy.bankMode,b.selected.policy.bankMode);
  assert.equal(a.selected.policy.waitHours,b.selected.policy.waitHours);
  // Scheduled strategies still retarget toward forecast times.
  const scheduled=searchResetPolicies({base:base(),prediction,targetDailyPercent:100,usageStrategy:'maximize'});
  assert.ok(scheduled.candidates.some(candidate=>candidate.policy.quantile!==null));
  assert.ok(Math.abs(a.selected.expected.pauseHours-b.selected.expected.pauseHours)<5);
});

test('页面说明来自求解结果；显式双假设也由同一求解器计算',()=>{
  const optimized=plan();
  assert.equal(optimized.recommendation.method,'scenario-based-rolling-policy-search');
  const assumed=plan({assumedResetCount:2});
  assert.equal(assumed.recommendation.method,'scenario-based-rolling-policy-search');
  assert.equal(assumed.recommendation.primary.assumedResetTimes.length,2);
  assert.equal(assumed.forecastScenario.secondSelected,true);
  assert.equal(assumed.milestones.points.flatMap(point=>point.events)
    .filter(event=>event.kind==='assumed-extra-reset').length,2);
});

test('零额度首个行动必须是等待或可用备用，不能建议先消耗尚不存在的额度',()=>{
  const result=plan({input:{...input,weeklyRemaining:0,resetDates:[]}});
  assert.equal(result.recommendation.firstAction.dailyPercent,0);
  const firstReset=result.recommendation.primary.assumedResetTimes[0];
  assert.ok(result.phasePlans.filter(phase=>Date.parse(phase.startAt)<Date.parse(firstReset))
    .every(phase=>phase.dailyPercent===0),'预测重置前没有用量，发生后才能使用新额度');
  const bank=plan({input:{...input,weeklyRemaining:0},prediction:null});
  assert.equal(bank.backupChoices[0].atHours,0);
  assert.equal(bank.recommendation.firstAction.dailyPercent,100);
  const firstPoint=bank.milestones.points[0];
  near(firstPoint.stateBefore.quota,0);near(firstPoint.stateAfter.quota,100);
});

test('事件模拟扫测：守恒、不可透支、同步补给不重复兑换，备用不重复使用',()=>{
  const forecast=publicResetScenarios({prediction,now:now.toISOString()});
  for(const quota of [0,10,83,100])for(const daily of [17,34,100])
    for(const publicEvents of [[],[24],[24,72],[1,26,144]]) {
      const state={...base(daily),remainingPercent:quota,normalResetInHours:24};
      const trace=simulateResetPolicy({base:state,policy:{quantile:.5,waitHours:12,useExpiring:true},
        scenario:{events:publicEvents},forecast,targetDailyPercent:daily});
      const supplies=trace.events.filter(event=>event.kind!=='expiry');
      near(quota+100*supplies.length-supplies.reduce((sum,event)=>sum+event.overwrittenPercent,0)
        -trace.work,trace.remainingQuota);
      const banks=trace.events.filter(event=>event.kind==='backup');
      assert.equal(new Set(banks.map(event=>event.resetIndex)).size,banks.length);
      assert.ok(trace.segments.every(segment=>segment.remainingBefore>=0&&segment.remainingAfter>=0));
      for(const time of publicEvents)assert.ok(!banks.some(event=>Math.abs(event.atHours-time)<1e-7));
  }
});
