import test from 'node:test';
import assert from 'node:assert/strict';
import { fitResetReleaseClock, estimateResetTime } from '../src/reset-release-clock.js';
import { predictReset, resetProbabilityByHours } from '../src/local-predictor.js';
import { predictionFromArchive } from '../src/reset-forecast.js';
import { planUsagePath } from '../src/usage-path-planner.js';
import { layoutStrategyTree, renderStrategyTree } from '../src/strategy-tree-layout.js';

// Suppressed windows keep about 5% of the usual rate: very unlikely, not impossible.
const veryUnlikely=(value,message)=>assert.ok(value>=0&&value<.05,message??`${value} 应很低`);

const HOUR = 3600000, DAY = 24 * HOUR;
const now = Date.parse('2026-10-16T08:00:00Z');
// 22:00 in Tibo's activity timezone is 05:00 UTC the following day.
const times = [6, 9, 12, 15].map(day => Date.parse(`2026-10-${String(day).padStart(2, '0')}T05:00:00Z`));
const timeZone = 'America/Los_Angeles';
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
const predict = extra => predictReset({ now: new Date(now).toISOString(), timeZone: 'Europe/Berlin',
  campaignTimeZone: timeZone, resetTimes: times.map(time => new Date(time).toISOString()), ...extra });

test('平均间隔参考仍可读取，页面最可能时间来自小时分布而非均值参考', () => {
  const prediction = predict(), estimate = prediction.resetTimeEstimate;
  assert.equal(prediction.releaseClock.typicalTime, '22:00');
  assert.equal(prediction.releaseClock.windowDays, null);
  assert.equal(prediction.releaseClock.sampleScope, 'all-history');
  assert.equal(prediction.releaseClock.sampleCount, 4);
  assert.equal(estimate.baseAt, new Date(times.at(-1) + 3 * DAY).toISOString());
  assert.equal(estimate.pointAt, '2026-10-18T05:00:00.000Z');
  near(estimate.earlierProbability + estimate.probability + estimate.laterProbability, 1);
  const result = planUsagePath({ now: new Date(now), timeZone: 'Europe/Berlin', prediction,
    input: { weeklyRemaining: 40, weeklyResetDays: 4, weeklyResetHours: 0, resetDates: [] } });
  const graph = layoutStrategyTree(result, { prediction });
  assert.equal(prediction.resetTimeMode.pointAt,'2026-10-18T04:30:00.000Z');
  assert.equal(graph.forecastFocus.planned,true,'页面竖线标规划计入的保守时刻');
  assert.ok(Date.parse(graph.forecastFocus.pointAt)>=Date.parse(prediction.resetTimeMode.pointAt));
  const html = renderStrategyTree(graph, String);
  assert.ok(html.includes(`data-reset-estimate="${graph.forecastFocus.pointAt}"`));
  assert.ok(html.includes(graph.forecastFocus.label),'标签显示规划时刻的当地时间');
  assert.doesNotMatch(html, /最可能 reset · \d+\/\d+|当天 [\d.]+%/);
});

test('钟点分布提高晚间机会，预告按截止失效，累计概率与预测摘要一致且单调', () => {
  const prediction = predict({ posts: [{ createdAt: new Date(now).toISOString(), text: 'Reset later today.',
    signal: { kind: 'reset_planned', confidence: .9, validUntil: new Date(now + 4 * HOUR).toISOString() } }] });
  near(prediction.todayProbability,resetProbabilityByHours(prediction,prediction.todayEndHours));
  near(prediction.next48Probability,resetProbabilityByHours(prediction,48));
  const baseline=predict();
  const hazard=(p,a,b)=>Math.log1p(-resetProbabilityByHours(p,a))-Math.log1p(-resetProbabilityByHours(p,b));
  assert.ok(hazard(prediction,3,4)>hazard(baseline,3,4),'预告在截止前提高机会');
  near(hazard(prediction,4,5),hazard(baseline,4,5));
  const change = (a, b) => resetProbabilityByHours(prediction, b) - resetProbabilityByHours(prediction, a);
  assert.ok(change(20, 22) > change(7, 9) * 50, '21–23点应比08–10点更符合历史发布时间');
  let previous = 0;
  for (let hour = 0; hour <= 336; hour += .25) {
    const probability = resetProbabilityByHours(prediction, hour);
    assert.ok(probability >= previous - 1e-10 && probability >= 0 && probability <= 1, `CDF在${hour}小时下降`);
    previous = probability;
  }
});

test('钟点使用全部历史等权样本，不随最近两周截断；跨午夜不平均成中午', () => {
  const oldMorning = [20, 23, 26].map(day => Date.parse(`2026-09-${day}T15:00:00Z`));
  assert.equal(fitResetReleaseClock({ times: [...oldMorning, ...times], now, timeZone }).typicalTime, '22:00');
  const full = fitResetReleaseClock({ times: [...oldMorning, ...times], now, timeZone });
  assert.equal(full.sampleCount, 7);
  assert.equal(full.sampleWeighting, 'equal');
  assert.equal(full.method, 'equal-weight-von-mises-kde');
  const aged = fitResetReleaseClock({ times: [...oldMorning, ...times], now: now+100*DAY, timeZone });
  assert.deepEqual(aged.quarterHourWeights, full.quarterHourWeights, '没有新样本时不能因变旧而改变钟点分布');
  const sparse = fitResetReleaseClock({ times: [...oldMorning, times.at(-1)], now, timeZone });
  assert.equal(sparse.windowDays, null);
  assert.equal(sparse.sampleCount, 4);
  assert.equal(fitResetReleaseClock({ times: times.slice(-2), now, timeZone }), null);
  const midnight = fitResetReleaseClock({ now, timeZone: 'UTC', times: [
    Date.parse('2026-10-12T23:45:00Z'), Date.parse('2026-10-14T00:15:00Z'), Date.parse('2026-10-15T23:50:00Z')] });
  assert.ok(midnight.typicalMinuteOfDay < 60 || midnight.typicalMinuteOfDay > 1380);
});

test('均值日期已过取下一个未来常见钟点；重复公告不增样本，备用不是自动 reset 样本', () => {
  const clock = fitResetReleaseClock({ times: [...times, times.at(-1) + 60000], now, timeZone });
  assert.equal(clock.sampleCount, 4);
  const overdue = estimateResetTime({ lastReset: times.at(-1) - 10 * DAY, meanIntervalDays: 3,
    now, clock, probabilityByHours: hours => 1 - Math.exp(-hours / 100) });
  assert.equal(overdue.meanAlreadyPassed, true);
  assert.ok(Date.parse(overdue.pointAt) > now && Date.parse(overdue.pointAt) < now + DAY);
  const forecast = predictionFromArchive({ now: new Date(now), timeZone: 'Europe/Berlin', archive: {
    retrievedAt: '2026-10-16', campaignTimeZone: timeZone,
    events: [...times.map(at => ({ at: new Date(at).toISOString(), kind: 'automatic' })),
      { at: new Date(now - HOUR).toISOString(), kind: 'banked' }] } });
  assert.equal(forecast.prediction.releaseClock.sampleCount, 4);
  assert.equal(forecast.prediction.releaseClock.typicalTime, '22:00');
});

test('当天功能硬规则不被平均间隔和常见晚间钟点绕过，预计点必须晚于封锁期限', () => {
  const forecastNow = '2026-10-22T12:00:00Z';
  const prediction = predict({ now: forecastNow, enforceCampaignFeatureRule: true, posts: [{ createdAt: forecastNow, text: 'Day 18/ New feature.',
    signal: { kind: 'new_feature', confidence: .95 } }] });
  veryUnlikely(prediction.todayProbability);
  assert.equal(prediction.resetTimeEstimate.meanAlreadyPassed, true);
  assert.ok(Date.parse(prediction.resetTimeEstimate.pointAt) >= Date.parse(prediction.evidence.hardRules[0].until));
  assert.equal(prediction.resetTimeEstimate.pointAt, '2026-10-24T05:00:00.000Z');
});
