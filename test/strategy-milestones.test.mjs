import test from 'node:test';
import assert from 'node:assert/strict';
import { planUsagePath } from '../src/usage-path-planner.js';
import { predictReset, resetProbabilityByHours } from '../src/local-predictor.js';
import { layoutStrategyTree } from '../src/strategy-tree-layout.js';

const now = new Date('2026-10-15T08:00:00Z');
const plan = (input = {}, extra = {}) => planUsagePath({ now, timeZone: 'Europe/Berlin',
  input: { weeklyRemaining: 40, weeklyResetDays: 4, weeklyResetHours: 0,
    credits: 0, resetDates: [], ...input }, ...extra });
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-5,
  `${actual} != ${expected}`);

test('相同速度合并到正常刷新，数字误差不生成假动作', () => {
  const result = plan({ weeklyRemaining: 10, weeklyResetDays: 6 }, { usageStrategy: 'maximize' });
  assert.equal(result.milestones.segments.length, 1);
  const [segment] = result.milestones.segments;
  near(segment.dailyPercent, 10 / 6);
  near(segment.usedPercent, 10);
  near(segment.endHours, 144);
  assert.deepEqual(result.milestones.points.map(point => point.reasons), [['current'], ['normal-refresh']]);
  near(segment.state.quota, 10);
  near(segment.endState.quota, 0);
  assert.equal(result.milestones.points.at(-1).stateAfter.quota, 100, '正常刷新后恢复满额');
});

test('耗尽与兑换发生在段内真实时刻，不等到下一日，也不插午夜节点', () => {
  const result = plan({ resetDates: ['2026-10-17'] });
  const depletion = result.milestones.points.find(point => point.reasons.includes('depletion'));
  near(depletion.hours, 48);
  assert.equal(depletion.at, '2026-10-17T08:00:00.000Z');
  assert.ok(depletion.reasons.includes('backup'));
  assert.equal(depletion.stateBefore.quota, 0);
  assert.equal(depletion.stateAfter.quota, 100);
  assert.equal(depletion.stateBefore.resets, 1);
  assert.equal(depletion.stateAfter.resets, 0);
  assert.equal(result.milestones.points.some(point => point.hours === 24), false);
  const marker = layoutStrategyTree(result).nodes.find(node => node.type === 'backup');
  assert.match(marker.lines[0], /10月17日 10:00/);
});

test('预测的本地午夜只是概率边界，不制造动作时间；显示的是从现在累计的概率', () => {
  const prediction = { todayEndHours: 14, todayProbability: 0.1,
    laterGivenNoReset: 0.2, next48Probability: 0.28, evidence: { dailyFrequency: 0.1 } };
  const result = plan({}, { prediction });
  assert.equal(result.milestones.points.some(point => point.hours === 14), false);
  assert.equal(result.milestones.probabilityBasis, 'cumulative-from-plan-start');
  for (const point of result.milestones.points)
    near(point.cumulativeResetProbability, resetProbabilityByHours(prediction, point.hours));
  const probabilities = result.milestones.points.map(point => point.cumulativeResetProbability);
  assert.ok(probabilities.every((value, index) => index === 0 || value >= probabilities[index - 1]));
});

test('合并后用量、覆盖与备用库存守恒，包括临期兑换', () => {
  for (const [input, extra] of [[{ resetDates: ['2026-10-15'] }, { paceMultiplier: 1.5 }],
    [{ resetDates: ['2026-10-17'] }, {}], [{ resetDates: ['2026-10-17', '2026-10-25'] }, { heldResetIndices: [1] }],
    [{ resetDates: ['2026-10-16'] }, { heldResetIndices: [0] }]]) {
    const result = plan(input, extra);
    const used = result.milestones.segments.reduce((total, segment) => total + segment.usedPercent, 0);
    const events = result.milestones.points.flatMap(point => point.events);
    const banks = events.filter(event => event.kind === 'backup');
    const expiries = events.filter(event => event.kind === 'expiry');
    const end = result.milestones.points.at(-1);
    assert.equal(banks.length + expiries.length + end.stateAfter.resets, result.resets.length);
    near(result.remainingPercent + banks.length * 100 - banks.reduce((total, event) => total + event.overwrittenPercent, 0)
      + events.filter(event => event.kind === 'normal-refresh' && event !== end.events.at(-1)).length * 100
      - used, end.stateBefore.quota);
    for (const event of events.filter(event => ['backup', 'expiry'].includes(event.kind))) {
      const point = result.milestones.points.find(point => Math.abs(point.hours - event.atHours) < 1e-5);
      assert.equal(point.stateBefore.resets - point.stateAfter.resets, 1);
    }
  }
});

test('预测情景下的消耗守恒，重复兑换或到期后兑换均不会出现', () => {
  const now = new Date('2026-10-15T08:00:00Z'), timeZone = 'Europe/Berlin';
  for (const p of [.1, .8]) {
    const prediction = predictReset({ now: now.toISOString(), timeZone, priorDailyProbability: p });
    const result = planUsagePath({ now, timeZone, prediction,
      input: { weeklyRemaining: 25, weeklyResetDays: 4, weeklyResetHours: 0, resetDates: ['2026-10-16', '2026-10-23'] } });
    const points = result.milestones.points, events = points.flatMap(point => point.events);
    const banks = events.filter(event => event.kind === 'backup');
    assert.equal(new Set(banks.map(event => event.resetIndex)).size, banks.length);
    for (const bank of banks) assert.ok(bank.atHours < result.resets[bank.resetIndex].expiresInHours);
    const consumed = result.milestones.segments.reduce((sum, segment) => sum + segment.usedPercent, 0);
    const supplied = points.slice(1, -1).reduce((sum, point) => sum + point.stateAfter.quota - point.stateBefore.quota, 0);
    near(result.remainingPercent + supplied - consumed, points.at(-1).stateBefore.quota);
  }
});
