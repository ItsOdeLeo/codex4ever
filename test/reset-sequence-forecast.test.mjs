import test from 'node:test';
import assert from 'node:assert/strict';
import { followingResetEstimate,followingResetDistribution,followingResetProbabilityByHours } from '../src/reset-sequence-forecast.js';
import { predictReset,resetProbabilityByHours } from '../src/local-predictor.js';
import { planUsagePath } from '../src/usage-path-planner.js';
import { layoutStrategyTree,renderStrategyTree } from '../src/strategy-tree-layout.js';
import { conservativeResetTimes } from '../src/reset-forecast.js';

const now='2026-10-17T12:00:00Z',HOUR=3600000;
const fixture=()=>({model:'local-recent-intervals-v5',enforceResetCooldown:true,
  timeZone:'America/Los_Angeles',resetTimeMode:{pointAt:'2026-10-18T05:30:00Z'},
  evidence:{intervalModel:{meanIntervalDays:3.7}},
  releaseClock:{timeZone:'America/Los_Angeles',typicalMinuteOfDay:22*60,typicalTime:'22:00'}});

test('第二次取首次参考时间加近期均值，按历史钟点校准，不把首次CDF当第二次概率',()=>{
  const prediction=fixture(),before=structuredClone(prediction);
  const result=followingResetEstimate({prediction,now});
  assert.equal(result.conditionalOn,'2026-10-18T05:30:00Z');
  assert.equal(result.meanIntervalDays,3.7);
  assert.equal(result.baseAt,'2026-10-21T22:18:00.000Z');
  assert.equal(result.meanReferenceAt,'2026-10-22T05:00:00.000Z');
  assert.equal(result.pointAt,followingResetDistribution({prediction,now}).mode.pointAt);
  assert.ok(result.probability>0&&result.probability<1);
  assert.equal(result.conditional,true);
  assert.deepEqual(prediction,before);
  prediction.releaseClock=null;
  assert.equal(followingResetEstimate({prediction,now}).meanReferenceAt,result.baseAt,'没有钟点样本不编造发布习惯');
});

test('短间隔仍尊重发布者次日冷却约束，显式关闭时不强加',()=>{
  const prediction=fixture();
  prediction.evidence.intervalModel.meanIntervalDays=.5;
  const blocked=followingResetEstimate({prediction,now});
  assert.ok(Date.parse(blocked.pointAt)>=Date.parse('2026-10-19T07:00:00Z'));
  prediction.enforceResetCooldown=false;
  const unblocked=followingResetEstimate({prediction,now});
  assert.ok(Date.parse(unblocked.pointAt)<Date.parse(blocked.pointAt));
});

test('缺少近期均值或首次参考时间不编造第二次；关闭预测不留下标线',()=>{
  const prediction=fixture();
  prediction.evidence.intervalModel=null;
  assert.equal(followingResetEstimate({prediction,now}),null);
  assert.equal(followingResetEstimate({prediction:null,now}),null);
  const result=planUsagePath({input:{weeklyRemaining:40,weeklyResetDays:4,weeklyResetHours:0,resetDates:[]},
    now:new Date(now),timeZone:'UTC',prediction:null});
  const graph=layoutStrategyTree(result);
  assert.equal(graph.forecastFollowing,null);
  assert.doesNotMatch(renderStrategyTree(graph,String),/data-reset-sequence="2"/);
});

test('第二次预测与用量／备用独立，共用时间轴，不产生未经选择的100%补给',()=>{
  const prediction=predictReset({now,timeZone:'Europe/Berlin',campaignTimeZone:'America/Los_Angeles',
    resetTimes:[3,7,11,13,15].map(day=>`2026-10-${String(day).padStart(2,'0')}T05:00:00Z`)});
  const cdf=[24,48,96,168].map(hour=>resetProbabilityByHours(prediction,hour));
  const input={weeklyRemaining:40,weeklyResetDays:4,weeklyResetHours:0,resetDates:[]};
  const plan=extra=>planUsagePath({input,now:new Date(now),timeZone:'Europe/Berlin',prediction,
    ...extra});
  const results=[plan({assumedResetCount:0}),plan({paceMultiplier:1.2,assumedResetCount:0}),plan({assumedResetCount:1})];
  // One rule: the second curve is conditioned on the first reset at its
  // conservative time, whether or not the plan counts it.
  const expected=results.map(result=>followingResetEstimate({prediction,now,
    firstAt:result.recommendation.primary?.assumedResetTimes?.[0]??conservativeResetTimes(result,prediction)[0]}).pointAt);
  assert.equal(results[2].recommendation.primary.assumedResetTimes[0],conservativeResetTimes(results[0],prediction)[0]);
  const graphs=results.map(result=>layoutStrategyTree(result,{prediction}));
  for(const [index,graph] of graphs.entries()) {
    const next=graph.forecastFollowing;
    assert.equal(next.pointAt,expected[index]);
    assert.ok(next.x>graph.forecastFocus.x);
    assert.ok(next.x<graph.width);
    assert.ok(graph.dayAxis.days.at(-1).endHours>=next.pointHours);
    const html=renderStrategyTree(graph,String);
    assert.match(html,/data-reset-sequence="2"/);
    assert.match(html,/第二次额外重置预测/);
    assert.match(html,/<span class="timeline-lane-text">第二次额外重置<\/span>/);
    assert.match(graph.resetLaneLabels[1].tooltip,/概率密度 · 以首次发生为前提/);
    assert.match(html,/data-density-sequence="2"/);
    assert.ok(graph.followingPlot.topY>graph.probabilityPlot.bottomY,'两次事件分开成行，共用日期坐标');
    assert.ok(!graph.funnel.refills.some(refill=>refill.at===next.pointAt));
  }
  assert.deepEqual([24,48,96,168].map(hour=>resetProbabilityByHours(prediction,hour)),cdf);
  assert.equal(graphs[0].funnel.refills.filter(refill=>refill.kind==='assumed-extra').length,0);
  assert.equal(graphs[2].funnel.refills.filter(refill=>refill.kind==='assumed-extra').length,1);
  const expectedDelta=(Date.parse(expected[0])-Date.parse(prediction.resetTimeMode.pointAt))/HOUR;
  assert.ok(Math.abs(graphs[0].forecastFollowing.x-graphs[0].forecastFocus.x-expectedDelta*180/24)<1e-6);
});

test('发布钟点按发布者时区估计，显示转换到当地并跨夏令时，不写死柏林',()=>{
  const prediction=fixture();
  prediction.resetTimeMode.pointAt='2026-10-24T05:30:00Z';
  const result=followingResetEstimate({prediction,now:'2026-10-23T12:00:00Z'});
  assert.equal(result.meanReferenceAt,'2026-10-28T05:00:00.000Z');
  const clock=timeZone=>new Intl.DateTimeFormat('en-GB',{timeZone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'})
    .format(new Date(result.meanReferenceAt));
  assert.equal(clock('Europe/Berlin'),'06:00');
  assert.equal(clock('Asia/Tokyo'),'14:00');
});

test('第二条曲线来自重新计时后的条件CDF，质量守恒、冷却期极低、最高窗口严格对齐',()=>{
  const prediction=predictReset({now,timeZone:'Europe/Berlin',campaignTimeZone:'America/Los_Angeles',
    resetTimes:[3,7,11,13,15].map(day=>`2026-10-${String(day).padStart(2,'0')}T05:00:00Z`)});
  const distribution=followingResetDistribution({prediction,now}),estimate=prediction.followingResetEstimate;
  const peak=distribution.bins.reduce((a,b)=>a.densityPerHour>=b.densityPerHour ? a : b);
  assert.equal(estimate.pointAt,distribution.mode.pointAt);
  assert.ok(Math.abs(estimate.pointHours-(peak.startHours+peak.endHours)/2)<1e-8);
  assert.ok(Math.abs(distribution.bins.reduce((sum,bin)=>sum+bin.probability,0)+distribution.tailProbability-1)<1e-10);
  const firstHours=(Date.parse(estimate.conditionalOn)-Date.parse(now))/HOUR;
  assert.equal(followingResetProbabilityByHours(prediction,now,firstHours),0);
  // The cooldown after the first reset keeps the renewal rate at about 5%: very unlikely, not impossible.
  const early=followingResetProbabilityByHours(prediction,now,firstHours+6);
  assert.ok(early>0&&early<.05);
  for(const bin of distribution.bins)assert.ok(Math.abs(bin.probability
    -followingResetProbabilityByHours(prediction,now,bin.endHours)
    +followingResetProbabilityByHours(prediction,now,bin.startHours))<1e-10);
  const hinted=structuredClone(prediction);
  hinted.next48Probability=.999;
  hinted.evidence.signalEffects=[{hint:1,ratio:1000}];
  assert.equal(followingResetProbabilityByHours(hinted,now,firstHours+96),
    followingResetProbabilityByHours(prediction,now,firstHours+96),'不把针对首次的旧提示重复使用到第二次');
});
