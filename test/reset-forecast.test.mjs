import test from 'node:test';
import assert from 'node:assert/strict';
import { predictionFromArchive } from '../src/reset-forecast.js';
import { predictReset, resetProbabilityByHours } from '../src/local-predictor.js';
import { planUsagePath } from '../src/usage-path-planner.js';
import { layoutStrategyTree, renderStrategyTree } from '../src/strategy-tree-layout.js';

const now = new Date('2026-10-15T08:00:00Z');
const timeZone = 'Europe/Berlin';
const input = { weeklyRemaining: 25, weeklyResetDays: 4, weeklyResetHours: 0, resetDates: [] };
const plan = extra => planUsagePath({ input, now, timeZone, ...extra });
const near = (a,b) => assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);
const prior = daily => predictReset({ now: now.toISOString(), timeZone, priorDailyProbability: daily });

test('档案在本地预测：同时发备用的直接重置纳入，纯备用、重复及未来记录排除', () => {
  const archive = { retrievedAt: '2026-10-13', events: [
    { at: '2026-09-01T08:00:00Z', kind: 'automatic' },
    { at: '2026-09-11T08:00:00Z', kind: 'automatic_and_banked' },
    { at: '2026-09-21T08:00:00Z', kind: 'automatic' },
    { at: '2026-10-01T08:00:00Z', kind: 'automatic' },
    { at: '2026-10-01T08:00:00Z', kind: 'automatic' },
    { at: '2026-10-13T08:00:00Z', kind: 'banked' },
    { at: '2026-10-16T08:00:00Z', kind: 'automatic' }
  ] };
  const result = predictionFromArchive({ archive, now, timeZone });
  assert.equal(result.available,true);
  assert.equal(result.prediction.evidence.observedIntervals,3);
  assert.equal(result.prediction.evidence.dataAsOf,'2026-10-13');
  assert.equal(result.prediction.calibrated,false);
});

test('过期档案或不足的历史明确关闭预测，不能生成默认概率', () => {
  assert.equal(predictionFromArchive({archive:{retrievedAt:'2026-09-01'},now,timeZone}).available,false);
  assert.equal(predictionFromArchive({archive:{retrievedAt:'2026-10-16'},now,timeZone}).available,false);
  assert.equal(predictionFromArchive({archive:{retrievedAt:'2026-10-13',events:[]},now,timeZone}).available,false);
  assert.equal(plan().resetForecast.enabled,false);
  assert.deepEqual(plan().forecastCalendar,[]);
});

test('高预测概率被计入计划并推迟耗尽，低概率不计入；未重置时的真实停用仍保留', () => {
  const no = plan(), low = plan({prediction:prior(.0001)}), high = plan({prediction:prior(.98)});
  const depletion = result => result.milestones.points.find(point=>point.reasons.includes('depletion')).hours;
  assert.equal(low.phasePlans[0].dailyPercent,no.phasePlans[0].dailyPercent);
  assert.equal(high.phasePlans[0].dailyPercent,no.phasePlans[0].dailyPercent,'保持节奏不改目标日均');
  assert.equal(no.recommendation.primary?.assumedResetTimes?.length ?? 0,0);
  assert.equal(low.recommendation.primary?.assumedResetTimes?.length ?? 0,0);
  assert.ok(high.recommendation.primary.assumedResetTimes.length>=1);
  assert.ok(depletion(high)>depletion(no));
  assert.equal(high.strategy.priority,'predicted-free-refills-before-banked-resets');
  const forecast = high.resetForecast.milestones[0];
  near(forecast.probability,resetProbabilityByHours(prior(.98),forecast.hours));
  near(forecast.probability+forecast.noResetProbability,1);
  near(forecast.hours,depletion(high));
  const graph = layoutStrategyTree(high,{prediction:prior(.98)});
  assert.ok(graph.funnel.bands.some(band=>band.kind==='pause' && band.startQuota===0 && band.endQuota===0));
  assert.deepEqual(graph.funnel.refills.map(refill=>refill.kind),['assumed-extra','normal']);
  assert.doesNotMatch(renderStrategyTree(graph,String),/未重置时暂停：|Pause if no reset:/);
});

test('备用使用概率取该时刻仍未重置的概率；保留与否共用固定日期预测', () => {
  const prediction = prior(.05);
  const withBank = { ...input,weeklyRemaining:40,resetDates:['2026-10-20'] };
  const result = plan({input:withBank,prediction});
  const held = plan({input:withBank,prediction,heldResetIndices:[0]});
  assert.deepEqual(result.forecastCalendar,held.forecastCalendar);
  const event = result.resetForecast.milestones.find(point=>point.kind==='backup');
  assert.ok(event);
  near(event.noResetProbability,1-resetProbabilityByHours(prediction,event.hours));
  const graph = layoutStrategyTree(result,{prediction});
  assert.ok(result.milestones.points.at(-1).hours>96,'备用延后的正常刷新仍在同一计划内');
  const choice=result.backupChoices.find(item=>item.used);
  near(choice.usageCondition.probability,event.noResetProbability);
  assert.match(renderStrategyTree(graph,String),/若耗尽，用备用/);
  assert.match(renderStrategyTree(graph,String),/未再 reset：/);
});
