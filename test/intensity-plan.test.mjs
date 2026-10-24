import test from 'node:test';
import assert from 'node:assert/strict';
import { planIntensityUsage } from '../src/intensity-plan.js';

const now = new Date('2026-10-14T12:00:00Z');
const input = overrides => ({ weeklyRemaining: 40, weeklyResetDays: 4,
  weeklyResetHours: 0, resetDates: [], credits: 0, ...overrides });
const plan = (overrides = {}, extra = {}) => planIntensityUsage({ input: input(overrides), now, ...extra });
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} != ${expected}`);

test('平均消耗与三种相对强度决定真实的耗尽和暂停日期', () => {
  const result = plan();
  near(result.averagePercentPerDay, 20);
  assert.deepEqual(result.options.map(option => option.dailyPercent), [20, 30, 10]);
  assert.deepEqual(result.options.map(option => option.stopAtHours), [48, 32, null]);
  assert.deepEqual(result.options.map(option => option.pauseHours), [48, 64, 0]);
  assert.deepEqual(result.options.map(option => option.days[0].remainingPercent), [20, 10, 30]);
  assert.equal(result.options[0].stopAt, '2026-10-16T12:00:00.000Z');
  assert.equal(result.normalResetAt, '2026-10-18T12:00:00.000Z');
});

test('备用 reset 在耗尽时衔接，不提前兑换覆盖余额', () => {
  const result = plan({ resetDates: ['2026-10-17'] });
  const steady = result.options[0];
  assert.equal(steady.canReachNormalRefresh, true);
  assert.equal(steady.backupUsed, 1);
  assert.equal(steady.events[0].atHours, 48);
  assert.equal(steady.events[0].early, false);
  near(steady.events[0].overwrittenPercent, 0);
  near(steady.days[1].remainingPercent, 100);
  const half = result.options[2];
  assert.equal(half.backupUsed, 0);
  assert.equal(half.expiredUnused.length, 1);
});

test('备用先到期且后续确有缺额时，计划在到期前使用；减半可不动用', () => {
  const result = plan({ resetDates: ['2026-10-15'] });
  const early = result.options[0].events.find(event => event.kind === 'backup');
  assert.equal(early.at, '2026-10-15T21:00:00.000Z');
  assert.equal(early.early, true);
  near(early.overwrittenPercent, 12.5);
  assert.equal(result.options[0].canReachNormalRefresh, true);
  assert.equal(result.options[2].backupUsed, 0);
});

test('未知 Credits 换算不伪造延长时间；提供换算后支付衔接', () => {
  const unknown = plan({ credits: 50 }).options[0];
  assert.equal(unknown.stopAtHours, 48);
  assert.equal(unknown.creditsSpent, 0);
  const known = plan({ credits: 50 }, { creditsPerPercent: 2.5 }).options[0];
  assert.equal(known.stopAtHours, 72);
  assert.equal(known.creditsSpent, 50);
  const enough = plan({ credits: 100 }, { creditsPerPercent: 2.5 }).options[0];
  assert.equal(enough.stopAtHours, null);
  near(enough.creditsSpent, 100);
});

test('耗尽前的重置概率对应补给决策的时点，发生后需重新规划', () => {
  const prediction = { todayEndHours: 12, todayProbability: 0.2,
    laterGivenNoReset: 0.25, next48Probability: 0.4,
    evidence: { dailyFrequency: 0.1 } };
  const result = plan({}, { prediction });
  near(result.options[0].forecast.probability, 0.4);
  assert.equal(result.options[0].forecast.byHours, 48);
  assert.equal(result.options[0].forecast.onReset, 'replan-from-full-balance');
  assert.equal(plan().options[0].forecast, null);
});

test('刚补满还没有消耗时按剩余额度平均分配并注明；零余额立即需要补给', () => {
  for (const fresh of [plan({ weeklyRemaining: 100 }), plan({ weeklyResetDays: 7 })]) {
    assert.equal(fresh.available, true, '不再整页空白');
    assert.equal(fresh.evenSplit, true, '注明是平均分配，不是实测速度');
    assert.ok(Math.abs(fresh.averagePercentPerDay - fresh.remainingPercent * 24 / fresh.normalResetInHours) < 1e-9);
  }
  assert.equal(plan({ weeklyRemaining: 60 }).evenSplit, false, '有消耗时仍用本轮实际平均');
  const empty = plan({ weeklyRemaining: 0 });
  assert.equal(empty.options[0].stopAtHours, 0);
  assert.equal(empty.options[0].days[0].remainingPercent, 0);
  const almostUnused = plan({ weeklyRemaining: 99.999999999999 });
  assert.equal(almostUnused.available, true);
  assert.equal(almostUnused.options[0].canReachNormalRefresh, true);
});

test('备用到期使用用户时区，跨夏令时不把日期提前一天', () => {
  const result = planIntensityUsage({ now: new Date('2026-10-24T12:00:00Z'),
    input: input({ resetDates: ['2026-10-25'] }), timeZone: 'Europe/Berlin' });
  assert.equal(result.resets[0].expiresAt, '2026-10-25T23:00:00.000Z');
});

test('多组资源模拟不透支余额、重复兑换或超额花 Credits', () => {
  let seed = 731;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  for (let i = 0; i < 64; i++) {
    const credits = Math.floor(random() * 200);
    const resetDates = random() > 0.5 ? ['2026-10-15', '2026-10-17'] : [];
    const result = plan({ weeklyRemaining: Math.floor(random() * 100),
      weeklyResetDays: 1 + Math.floor(random() * 6), resetDates, credits }, { creditsPerPercent: 2.5 });
    for (const option of result.options) {
      assert.ok(option.backupUsed <= resetDates.length);
      assert.ok(option.creditsSpent >= -1e-8 && option.creditsSpent <= credits + 1e-8);
      assert.ok(option.days.every(day => day.remainingPercent >= -1e-8 && day.remainingPercent <= 100));
      assert.ok(option.stopAtHours === null || option.stopAtHours < result.normalResetInHours);
      assert.ok(option.events.filter(event => event.kind === 'backup').every(event =>
        Date.parse(event.at) < Date.parse(result.resets.find(reset => reset.expiresOn === event.expiresOn).expiresAt)));
    }
  }
});
