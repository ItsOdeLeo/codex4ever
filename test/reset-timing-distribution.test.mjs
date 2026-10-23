import test from 'node:test';
import assert from 'node:assert/strict';
import { resetTimingDistribution, hourlyResetDistribution } from '../src/reset-timing-distribution.js';
import { predictReset, resetProbabilityByHours } from '../src/local-predictor.js';
import { planUsagePath } from '../src/usage-path-planner.js';
import { layoutStrategyTree, renderStrategyTree } from '../src/strategy-tree-layout.js';
import { usageRateComparison } from '../src/usage-rate-label.js';

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);

test('小时网格按固定钟点对齐，刷新分钟不能制造07:04这样的预计点；边界概率守恒',()=>{
  const peakStart=Date.parse('2026-10-18T04:00:00Z');
  for(const now of ['2026-10-16T13:34:37.335Z','2026-10-16T13:39:37.335Z']) {
    const origin=Date.parse(now);
    const distribution=hourlyResetDistribution({now,horizonHours:60.25,
      probabilityByHours:hours=>.2*Math.max(0,Math.min(1,(origin+hours*3600000-peakStart)/3600000))});
    assert.equal(distribution.mode.from,'2026-10-18T04:00:00.000Z');
    assert.equal(distribution.mode.to,'2026-10-18T05:00:00.000Z');
    assert.equal(distribution.mode.pointAt,'2026-10-18T04:30:00.000Z');
    assert.equal(distribution.bins[0].startAt,now);
    assert.equal(distribution.bins[0].endAt,'2026-10-16T14:00:00.000Z');
    assert.equal(distribution.bins.at(-1).endHours,60.25);
    near(distribution.bins.reduce((sum,bin)=>sum+bin.probability,0)+distribution.tailProbability,1);
    for(const bin of distribution.bins)near(bin.probability,
      bin.densityPerHour*(bin.endHours-bin.startHours));
  }
});

test('最可能日期来自单日概率质量，左右尾部包含搜索范围外概率，三项合计1', () => {
  const masses = [.12, .28, .2, .1, .05];
  const cdf = hours => masses.reduce((sum, mass, index) => sum
    + mass * Math.max(0, Math.min(1, hours / 24 - index)), 0);
  const result = resetTimingDistribution({ now: '2026-10-16T00:00:00Z', timeZone: 'UTC',
    probabilityByHours: cdf, searchDays: 5 });
  assert.equal(result.mostLikely.date, '2026-10-17');
  near(result.mostLikely.probability, .28);
  near(result.mostLikely.earlierProbability, .12);
  near(result.mostLikely.laterProbability, .6);
  near(result.mostLikely.earlierProbability + result.mostLikely.probability + result.mostLikely.laterProbability, 1);
  near(result.days.reduce((sum, day) => sum + day.probability, 0), .75);
  assert.ok(result.mostLikely.laterProbability > result.mostLikely.probability,
    '最多的一天并不表示超过其他所有未来日期之和');
});

test('自然日分布考虑当前日剩余时间和夏令时，不把每一天都强行当24小时', () => {
  const dst = resetTimingDistribution({ now: '2026-10-23T22:00:00Z', timeZone: 'Europe/Berlin',
    probabilityByHours: hours => hours / 100, searchDays: 3 });
  assert.equal(dst.mostLikely.date, '2026-10-25');
  near(dst.mostLikely.toHours - dst.mostLikely.fromHours, 25);
  near(dst.mostLikely.probability, .25);
  const partial = resetTimingDistribution({ now: '2026-10-16T18:00:00Z', timeZone: 'Europe/Berlin',
    probabilityByHours: hours => hours / 100, searchDays: 2 });
  near(partial.days[0].toHours, 4);
  near(partial.days[0].probability, .04);
  assert.equal(partial.mostLikely.date, '2026-10-17');
});

test('所有日期概率为零或没有有效CDF时，不编造most likely日期', () => {
  assert.equal(resetTimingDistribution({ now: '2026-10-16', timeZone: 'UTC',
    probabilityByHours: () => 0 }).mostLikely, null);
  assert.equal(resetTimingDistribution({ now: '2026-10-16', timeZone: 'UTC',
    probabilityByHours: () => null }), null);
});

test('预测器输出独立的最可能日期，不把中位时间当成mode；活动约束也进入该分布', () => {
  const now = '2026-10-16T20:00:00Z', timeZone = 'Europe/Berlin';
  const prediction = predictReset({ now, timeZone, enforceCampaignFeatureRule: true, campaignTimeZone: 'America/Los_Angeles',
    priorDailyProbability: .15, posts: [{ text: 'Day 12/ Shipped a new feature.', createdAt: now,
      signal: { kind: 'new_feature', confidence: .95 } }] });
  const mode = prediction.resetTimingDistribution.mostLikely;
  assert.notEqual(mode.date, prediction.nextResetWindow.medianAt.slice(0, 10));
  assert.ok(Date.parse(mode.from) >= Date.parse(prediction.evidence.hardRules[0].until));
  near(mode.probability, resetProbabilityByHours(prediction, mode.toHours)
    - resetProbabilityByHours(prediction, mode.fromHours));
  near(mode.earlierProbability, resetProbabilityByHours(prediction, mode.fromHours));
  near(mode.laterProbability, 1 - resetProbabilityByHours(prediction, mode.toHours));
});

test('预计时间点可以晚于七天；轴标跟随同一预测时钟，用量/备用只改变实际耗尽', () => {
  const now = new Date('2026-10-16T08:00:00Z'), timeZone = 'Europe/Berlin';
  const prediction = { model: 'local-recent-intervals-v4', next48Probability: 0,
    forecastWindows: [{ startHours: 0, endHours: 48, baselineProbability: 0, probability: 0 }],
    evidence: { ageHazards: [...Array(10).fill(0), .8], daysSinceReset: 0, dailyFrequency: .05 } };
  prediction.resetTimingDistribution = resetTimingDistribution({ now, timeZone,
    probabilityByHours: hours => resetProbabilityByHours(prediction, hours) });
  assert.ok(prediction.resetTimingDistribution.mostLikely.fromHours > 168);
  const pointHours = 243, fromHours = 241.5, toHours = 244.5;
  const earlier = resetProbabilityByHours(prediction, fromHours), after = resetProbabilityByHours(prediction, toHours);
  prediction.resetTimeEstimate = { pointAt: new Date(now.getTime() + pointHours * 3600000).toISOString(),
    pointHours, fromHours, toHours, nearbyHours: 3, probability: after - earlier,
    earlierProbability: earlier, laterProbability: 1 - after };
  const input = { weeklyRemaining: 40, weeklyResetDays: 4, weeklyResetHours: 0,
    resetDates: ['2026-10-18'] };
  const plan = extra => planUsagePath({ input, now, timeZone, prediction,
    ...extra });
  const held = plan({ heldResetIndices: [0] });
  const used = plan({ requiredResetIndices: [0], paceMultiplier: 1.2 });
  const left = layoutStrategyTree(held), right = layoutStrategyTree(used);
  // Text rows may move to avoid the path's final CDF label. The date-axis
  // coordinates and all probabilities must stay fixed.
  const { y: leftY, ...leftFocus } = left.forecastFocus;
  const { y: rightY, ...rightFocus } = right.forecastFocus;
  assert.deepEqual(leftFocus, rightFocus);
  assert.ok(left.dayAxis.days.at(-1).endHours >= left.forecastFocus.toHours);
  assert.equal(held.milestones.points.find(point => point.reasons.includes('depletion')).hours, 48);
  const pauses = left.funnel.bands.filter(band => band.kind === 'pause');
  assert.ok(pauses.length);
  for (const band of pauses) assert.equal(band.startHalf + band.endHalf, 0);
  const html = renderStrategyTree(left, String);
  assert.match(html, /data-reset-estimate=/);
  assert.match(html, /更早 [\d.]+%/);
  assert.doesNotMatch(html, /附近 [\d.]+ 小时 [\d.]+%/);
  assert.match(html, /更晚 [\d.]+%/);
  assert.equal(left.funnel.refills.some(refill => refill.kind === 'extra-reset'), false);
  assert.equal(layoutStrategyTree(plan({ prediction: null })).forecastFocus, null);
});

test('用量百分比明确对应日均周额度：20%每天减量50%是10%每天', () => {
  assert.equal(usageRateComparison(20, 10), '日均周额度 20% → 10% · 用量减少 50%');
  assert.equal(usageRateComparison(20, 22), '日均周额度 20% → 22% · 用量增加 10%');
  assert.equal(usageRateComparison(20, 20), '保持当前用量');
});
