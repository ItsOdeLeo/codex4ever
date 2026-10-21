import test from 'node:test';
import assert from 'node:assert/strict';
import { predictReset, resetProbabilityByHours } from '../src/local-predictor.js';
import { classifyTiboPosts } from '../src/llm-classifier.js';

// Suppressed windows keep about 5% of the usual rate: very unlikely, not impossible.
const veryUnlikely=(value,message)=>assert.ok(value>=0&&value<.05,message??`${value} 应很低`);

const now = '2026-10-13T12:00:00Z';
const timeZone = 'UTC';
const post = kind => ({ text: 'Example post', createdAt: now,
  signal: { kind, confidence: 1 } });

test('没有频率数据或显式先验时不伪造 reset 概率', () => {
  assert.throws(() => predictReset({ now }), /至少需要四次/);
  assert.throws(() => predictReset({ now, priorDailyProbability: 1 }), /先验日概率/);
  assert.throws(() => predictReset({ now, resetTimes: [now, now, now, now] }), /按时间递增/);
});

test('历史间隔产生本地日级预测，LLM 只提供证据分类', () => {
  const resetTimes = ['2026-08-01T12:00:00Z', '2026-08-11T12:00:00Z',
    '2026-08-21T12:00:00Z', '2026-09-01T12:00:00Z', '2026-09-12T12:00:00Z'];
  const base = predictReset({ now: '2026-09-20T12:00:00Z', timeZone, resetTimes });
  const feature = predictReset({ now: '2026-09-20T12:00:00Z', timeZone, resetTimes,
    posts: [{ ...post('new_feature'), createdAt: '2026-09-20T12:00:00Z' }] });
  const hint = predictReset({ now: '2026-09-20T12:00:00Z', timeZone, resetTimes,
    posts: [{ ...post('reset_hint'), createdAt: '2026-09-20T12:00:00Z' }] });
  assert.equal(base.evidence.observedIntervals, 4);
  assert.ok(feature.todayProbability < base.todayProbability);
  assert.ok(hint.todayProbability > base.todayProbability);
  assert.ok(base.next48Probability >= base.todayProbability);
  assert.ok(base.next48Probability < 1);
  assert.equal(base.calibrated, false);
});

test('预测把已等待的天数纳入条件概率，累计概率不会因分支拆分而下降', () => {
  const dayMs = 86_400_000;
  const at = Date.parse('2026-10-14T00:00:00Z');
  const intervals = [2.5, 2.5, 2.5, 3, 3, 3, 3.5, 3.5];
  let cursor = at - (0.2 + intervals.reduce((sum, duration) => sum + duration, 0)) * dayMs;
  const resetTimes = [new Date(cursor).toISOString()];
  for (const duration of intervals) {
    cursor += duration * dayMs;
    resetTimes.push(new Date(cursor).toISOString());
  }
  const prediction = predictReset({ now: new Date(at).toISOString(), timeZone: 'UTC', resetTimes });
  assert.equal(prediction.model, 'local-recent-intervals-v5');
  assert.ok(prediction.laterGivenNoReset > prediction.todayProbability);
  const cumulative = [24, 48, 72].map(hours => resetProbabilityByHours(prediction, hours));
  assert.ok(cumulative[0] < cumulative[1] && cumulative[1] < cumulative[2]);
  const secondConditional = (cumulative[1] - cumulative[0]) / (1 - cumulative[0]);
  assert.ok(secondConditional > cumulative[0]);
});

test('标准 Chat Completions API 分类帖子并校验结构化结果', async () => {
  let request;
  const result = await classifyTiboPosts([{ text: 'New feature today', createdAt: now }], {
    model: 'test-model', baseUrl: 'https://api.example.test/v1', apiKey: 'test-secret',
    fetchImpl: async (url, options) => {
      request = { url: String(url), headers: options.headers, body: JSON.parse(options.body) };
      return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ kind: 'new_feature',
        confidence: 0.8, reason: '发布功能' }) } }] }) };
    }
  });
  assert.equal(request.url, 'https://api.example.test/v1/chat/completions');
  assert.equal(request.headers.authorization, 'Bearer test-secret');
  assert.equal(request.body.model, 'test-model');
  assert.equal(request.body.messages[1].role, 'user');
  assert.equal(request.body.stream, false);
  assert.equal(result[0].signal.kind, 'new_feature');
  await assert.rejects(classifyTiboPosts([{ text: 'x', createdAt: now }], {
    model: 'test-model', baseUrl: 'http://example.com/v1' }), /HTTPS 或本机 HTTP/);
  await assert.rejects(classifyTiboPosts([{ text: 'x', createdAt: now }], {
    model: 'test-model', fetchImpl: async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: '{"kind":"bad"}' } }] }) })
  }), /分类字段无效/);
});

test('独立预测入口忽略旧事回顾，并按发生时间核对历史而非按发帖时间重复报新reset',()=>{
  const input={now:'2026-10-19T12:00:00Z',timeZone:'UTC',
    resetTimes:['2026-10-01T10:00:00Z','2026-10-05T10:00:00Z','2026-10-10T10:00:00Z','2026-10-18T10:00:00Z']};
  const base=predictReset(input);
  const historical={text:'We reset Codex usage last week. No new reset today.',createdAt:input.now,
    signal:{kind:'reset_completed',confidence:1,resetTiming:'current'}};
  assert.equal(predictReset({...input,posts:[historical]}).next48Probability,base.next48Probability);
  const delayed={text:'We reset Codex usage at 2026-10-18T10:00:00Z. The reset is complete.',createdAt:input.now,
    signal:{kind:'reset_completed',confidence:1,resetTiming:'current',resetOccurredAt:'2026-10-18T10:00:00Z'}};
  assert.doesNotThrow(()=>predictReset({...input,posts:[delayed]}));
});

test('预告信号的今日边界取当地午夜，概率仍在 0–1 之间', () => {
  const prediction = predictReset({ now, timeZone, priorDailyProbability: 0.1,
    posts: [post('reset_hint')] });
  assert.equal(prediction.todayEndHours, 12);
  assert.ok(prediction.todayProbability > 0 && prediction.todayProbability < 1);
  assert.ok(prediction.next48Probability >= prediction.todayProbability);
});

test('今天的边界遵循时区与夏令时', () => {
  const forecast = predictReset({ now: '2026-03-28T23:00:00Z',
    timeZone: 'Europe/Berlin', priorDailyProbability: 0.1 });
  assert.equal(forecast.todayEndHours, 23);
});

test('已完成的自动 reset 要先更新状态，过期预告和备用 reset 不提高下一次概率', () => {
  const history = ['2026-09-10T00:00:00Z', '2026-09-20T00:00:00Z',
    '2026-09-30T00:00:00Z', '2026-10-10T00:00:00Z'];
  const completed = { text: 'Reset is done', createdAt: '2026-10-13T05:06:00Z',
    signal: { kind: 'reset_completed', confidence: 1 } };
  const planned = { text: 'Global reset by EOD', createdAt: '2026-10-13T01:03:00Z',
    signal: { kind: 'reset_planned', confidence: 1 } };
  const baseInput = { now: '2026-10-13T18:00:00Z', timeZone: 'UTC',
    resetTimes: [...history, completed.createdAt] };
  assert.throws(() => predictReset({ ...baseInput, resetTimes: history,
    posts: [completed] }), /先更新历史 reset 时间/);
  const base = predictReset(baseInput);
  const after = predictReset({ ...baseInput, posts: [planned, completed,
    { ...planned, text: 'Banked credit', createdAt: '2026-10-13T06:00:00Z',
      signal: { kind: 'banked_credit', confidence: 1 } }] });
  assert.equal(after.todayProbability, base.todayProbability);
});

test('有明确截止时间的预告只影响对应时段', () => {
  const input = { now, timeZone, priorDailyProbability: 0.1 };
  const base = predictReset(input);
  const planned = predictReset({ ...input, posts: [{ ...post('reset_planned'),
    signal: { kind: 'reset_planned', confidence: 1,
      validUntil: '2026-10-14T00:00:00Z' } }] });
  assert.ok(planned.todayProbability > base.todayProbability);
  assert.ok(Math.abs(planned.laterGivenNoReset-base.laterGivenNoReset)<1e-12);
});

test('同一天多次公开公告按事件日计数，不产生超过 100% 的基线', () => {
  const result = predictReset({ now: '2026-10-13T18:00:00Z', timeZone: 'UTC',
    resetTimes: ['2026-10-11T18:00:00Z', '2026-10-12T01:00:00Z',
      '2026-10-12T20:00:00Z', '2026-10-13T01:00:00Z'] });
  assert.equal(result.evidence.recentEventDays, 3);
  assert.ok(result.evidence.dailyFrequency < 1);
  veryUnlikely(result.todayProbability);
});
