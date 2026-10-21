import test from 'node:test';
import assert from 'node:assert/strict';
import { planUsagePath } from '../src/usage-path-planner.js';
import { layoutStrategyTree, renderStrategyTree } from '../src/strategy-tree-layout.js';

const now = new Date('2026-10-15T08:00:00Z');
const input = { weeklyRemaining: 40, weeklyResetDays: 4, weeklyResetHours: 0,
  resetDates: ['2026-10-17'], credits: 0 };
const plan = extra => planUsagePath({ input, now, timeZone: 'Europe/Berlin', ...extra });
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-5, `${a} != ${b}`);

test('保持/+10%/+20%按同一平均速度计算，直接改变耗尽日期', () => {
  const plans = [1, 1.1, 1.2].map(paceMultiplier => plan({paceMultiplier, heldResetIndices:[0]}));
  for (const [index, result] of plans.entries()) {
    const depletion = result.milestones.points.find(point => point.reasons.includes('depletion'));
    near(depletion.hours, 40 / (20 * [1, 1.1, 1.2][index]) * 24);
    assert.equal(result.normalResetAt, '2026-10-19T08:00:00.000Z');
  }
});

test('使用备用后重开7天，原来的正常刷新不再补满；保留分支仍按原日期', () => {
  const used = plan();
  const bank = used.milestones.points.find(point => point.reasons.includes('backup'));
  assert.equal(bank.hours, 48);
  assert.equal(bank.stateBefore.quota, 0);
  assert.equal(bank.stateAfter.quota, 100);
  assert.equal(used.normalResetAt, '2026-10-24T08:00:00.000Z');
  assert.equal(used.normalResetSource, 'estimated-restarted-week');
  assert.equal(used.originalNormalResetAt, '2026-10-19T08:00:00.000Z');
  assert.equal(used.milestones.points.some(point => point.hours === 96 && point.reasons.includes('normal-refresh')), false);
  const graph = layoutStrategyTree(used);
  assert.equal(graph.funnel.refills.filter(refill => refill.kind === 'normal').length, 1);
  assert.equal(graph.funnel.refills.find(refill => refill.kind === 'normal').at, used.normalResetAt);
  const held = plan({heldResetIndices:[0]});
  assert.equal(held.milestones.points.some(point => point.reasons.includes('backup')), false);
  assert.equal(held.normalResetAt, held.originalNormalResetAt);
  assert.doesNotMatch(renderStrategyTree(layoutStrategyTree(held), String), /data-backup-choice="0"/);
});

test('固定日期的预测不随用量或备用选择变化，CDF仍进入规划', () => {
  const prediction = { todayEndHours: 14, todayProbability: 0.1, laterGivenNoReset: 0.2,
    next48Probability: 0.28, evidence:{dailyFrequency:0.1} };
  const plans = [1, 1.1, 1.2].map(paceMultiplier => plan({prediction, paceMultiplier}));
  const held = plan({prediction, heldResetIndices:[0]});
  assert.deepEqual(plans[0].forecastCalendar, plans[1].forecastCalendar);
  assert.deepEqual(plans[0].forecastCalendar, plans[2].forecastCalendar);
  assert.deepEqual(plans[0].forecastCalendar, held.forecastCalendar);
  assert.ok(plans[0].forecastCalendar.some(point => point.probability > 0));
  assert.deepEqual(plan().forecastCalendar, [], '关闭预测时没有预测日历');
  assert.equal(plans[0].recommendation.method, plan().recommendation.method, '预测只改输入，不换算法');
});

test('预测日界线使用本地午夜，跨夏令时仍然显示整天', () => {
  const result = plan({now:new Date('2026-10-24T08:00:00Z'), input:{...input, resetDates:[]},
    prediction:{todayEndHours:14,todayProbability:0.1,laterGivenNoReset:0.1,
      next48Probability:0.19,evidence:{dailyFrequency:0.1}}});
  assert.equal(result.forecastCalendar[0].at, '2026-10-24T22:00:00.000Z');
  assert.equal(result.forecastCalendar[1].at, '2026-10-25T23:00:00.000Z');
  const html = renderStrategyTree(layoutStrategyTree(result), String);
  assert.doesNotMatch(html, /23:59/);
});

test('未知 Credits 不增加额度；14天截断时不虚构正常刷新', () => {
  const paid = plan({input:{...input,credits:500,allowCredits:true}});
  assert.deepEqual(paid.milestones.points.map(point => point.stateBefore.quota),
    plan().milestones.points.map(point => point.stateBefore.quota));
  assert.equal(paid.credits.allowed, true);
  assert.equal(paid.credits.bridge, null, 'Credits 消耗未知，不安排衔接');
  const many = plan({input:{...input,resetDates:['2026-10-15','2026-10-16','2026-10-17',
    '2026-10-18','2026-10-19','2026-10-20','2026-10-21','2026-10-22']}});
  assert.equal(many.milestones.endKind, 'planning-horizon');
  assert.equal(many.milestones.points.at(-1).stateAfter.quota, many.milestones.points.at(-1).stateBefore.quota);
  assert.ok(layoutStrategyTree(many).funnel.refills.every(refill => refill.kind !== 'normal'));
});
