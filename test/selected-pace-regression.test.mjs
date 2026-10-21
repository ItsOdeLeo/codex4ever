import test from 'node:test';
import assert from 'node:assert/strict';
import { planUsagePath } from '../src/usage-path-planner.js';
import { predictReset } from '../src/local-predictor.js';
import { layoutStrategyTree, renderStrategyTree } from '../src/strategy-tree-layout.js';

// Screenshot regression: after the first refill an old solver chose 50%,
// then just 3.1% of observed use to stretch 17.1% quota to the next refresh.
// "Keep pace" (balanced) must keep the target daily use on every active phase.
const now = new Date('2026-10-16T07:46:00Z');
const timeZone = 'Europe/Berlin';
const input = { weeklyRemaining: 40, weeklyResetDays: 6, weeklyResetHours: 10,
  resetDates: ['2026-10-16', '2026-10-23'] };
const baseline = 60 / (7 - (6 + 10 / 24));
const prediction = predictReset({ now: now.toISOString(), timeZone, priorDailyProbability: .3 });
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-4,
  `${actual} != ${expected}`);
const plan = extra => planUsagePath({ input, now, timeZone, prediction, ...extra });
const banks = result => result.milestones.points.flatMap(point => point.events)
  .filter(event => event.kind === 'backup');

function assertSelectedPace(result, multiplier = 1, forecast = prediction) {
  const target = result.averagePercentPerDay * multiplier;
  for (const segment of result.milestones.segments) {
    const start = result.milestones.points.find(point => Math.abs(point.hours - segment.startHours) < 1e-9);
    if (start.stateAfter.quota <= 1e-6) {
      assert.ok(Math.abs(segment.usedPercent) < 1e-6, '没有额度时不能消耗');
      continue;
    }
    near(segment.dailyPercent, target);
  }
  for (const phase of result.phasePlans.filter(phase => phase.quotaBefore > 1e-9 && !phase.plannedRest))
    near(phase.dailyPercent, target);
  assert.doesNotMatch(renderStrategyTree(layoutStrategyTree(result, { prediction: forecast }), String),
    /比当前减少|用量减少|若两天后仍未额外 reset/);
}

test('截图回归：备用补满及48小时之后都不能自动减量，按真实速度耗尽再画零线', () => {
  const result = plan({ requiredResetIndices: [0], heldResetIndices: [1], assumedResetCount: 0 });
  assertSelectedPace(result);
  near(result.averagePercentPerDay, baseline);
  const first = banks(result)[0];
  assert.ok(first.atHours <= 40 / baseline * 24 + 1e-6, '备用最晚在耗尽时补上');
  const lastDepletion = result.milestones.points.filter(point => point.reasons.includes('depletion')).at(-1);
  near(lastDepletion.hours - first.atHours, 100 / baseline * 24);
  const graph = layoutStrategyTree(result, { prediction });
  const pauses = graph.funnel.bands.filter(band => band.kind === 'pause');
  assert.ok(pauses.length);
  assert.equal(pauses[0].startAt, lastDepletion.at);
  for (const band of pauses) {
    assert.equal(band.startHalf, 0);
    assert.equal(band.endHalf, 0);
  }
});

test('两张备用使用、全部保留、预测开关均保留目标日均', () => {
  for (const forecast of [prediction, null]) {
    const used = plan({ prediction: forecast, requiredResetIndices: [0, 1], assumedResetCount: 0 });
    assertSelectedPace(used, 1, forecast);
    const held = plan({ prediction: forecast, heldResetIndices: [0, 1], assumedResetCount: 0 });
    assertSelectedPace(held, 1, forecast);
    assert.equal(banks(held).length, 0);
    near(held.milestones.points.find(point => point.reasons.includes('depletion')).hours, 40 / baseline * 24);
    assert.equal(held.normalResetAt, held.originalNormalResetAt);
  }
});

test('加量目标沿用到备用补满后的阶段', () => {
  const result = plan({ paceMultiplier: 1.2, requiredResetIndices: [0, 1], assumedResetCount: 0 });
  assertSelectedPace(result, 1.2);
  assert.ok(banks(result).length >= 1);
});

test('零余额等到备用补满后也继承目标日均，补满前不消耗', () => {
  const result = plan({ input: { ...input, weeklyRemaining: 0 }, averagePercentPerDay: 100,
    paceMultiplier: 1.2, requiredResetIndices: [0], heldResetIndices: [1] });
  assertSelectedPace(result, 1.2);
  const bank = banks(result)[0];
  assert.ok(bank.atHours < result.resets[0].expiresInHours);
  assert.ok(result.phasePlans.filter(phase => phase.startHours < bank.atHours).every(phase => phase.dailyPercent === 0));
  assert.equal(result.phasePlans.find(phase => Math.abs(phase.startHours - bank.atHours) < 1e-9).dailyPercent, 120);
});

test('目标用量扫测：低余额、不同速度、备用去留与预测均不均摊余额，额度守恒', () => {
  for (const remaining of [10, 40, 90]) for (const rate of [20, 100])
    for (const multiplier of [1, 1.1, 1.2]) for (const forecast of [null, prediction])
      for (const held of [[], [0, 1]]) {
        const result = plan({ input: { ...input, weeklyRemaining: remaining },
          averagePercentPerDay: rate, prediction: forecast, paceMultiplier: multiplier,
          heldResetIndices: held });
        assertSelectedPace(result, multiplier, forecast);
        const events = banks(result);
        assert.equal(new Set(events.map(event => event.resetIndex)).size, events.length);
        for (const event of events) assert.ok(!held.includes(event.resetIndex));
        for (const event of events) assert.ok(event.atHours < result.resets[event.resetIndex].expiresInHours);
        const refilled = result.milestones.points.reduce((sum, point) => sum
          + Math.max(0, point.stateAfter.quota - point.stateBefore.quota), 0);
        near(result.remainingPercent + refilled
          - result.milestones.segments.reduce((sum, segment) => sum + segment.usedPercent, 0),
        result.milestones.points.at(-1).stateAfter.quota);
      }
});
