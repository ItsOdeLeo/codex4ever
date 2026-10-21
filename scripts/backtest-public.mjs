import { readFile } from 'node:fs/promises';
import { predictReset } from '../src/local-predictor.js';
import { planUsagePath } from '../src/usage-path-planner.js';

const data = JSON.parse(await readFile(new URL('../experiments/public-reset-events.json', import.meta.url)));
const events = data.events.filter(event => ['automatic','automatic_and_banked'].includes(event.kind)
  && event.at >= '2026-03-01').map(event => event.at);
const zone = 'America/Los_Angeles';
const day = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' });
// One target per Pacific calendar day. Two July 10 announcements count as one event day.
const byDay = new Map();
for (const at of events) {
  const key = day.format(new Date(at));
  if (!byDay.has(key)) byDay.set(key, at);
}
const dailyEvents = [...byDay.values()].sort();
const rows = [];
for (let nowMs = Date.parse('2026-05-01T07:01:00Z'); nowMs <= Date.parse('2026-10-13T07:01:00Z'); nowMs += 86_400_000) {
  const now = new Date(nowMs).toISOString();
  const history = dailyEvents.filter(at => at < now);
  if (history.length < 4) continue;
  const probability = predictReset({ now, timeZone: zone, resetTimes: history }).todayProbability;
  const noCooldown = predictReset({ now, timeZone: zone, resetTimes: history,
    enforceResetCooldown: false }).todayProbability;
  // The old hard rule set the cooldown to zero; compare it with the soft default.
  const hardZero = predictReset({ now, timeZone: zone, resetTimes: history,
    suppressedHazardFactor: 0 }).todayProbability;
  const happened = dailyEvents.some(at => at >= now && Date.parse(at) < nowMs + 86_400_000) ? 1 : 0;
  const last60 = dailyEvents.filter(at => Date.parse(at) >= nowMs - 60 * 86_400_000 && at < now).length;
  const baseline = (last60 + 1) / 62;
  rows.push({ date: day.format(new Date(now)), happened, probability, noCooldown, hardZero, baseline });
}
const brier = (items, key) => items.reduce((sum, row) => sum + (row[key] - row.happened) ** 2, 0) / items.length;
const logLoss = (items, key) => items.reduce((sum, row) => {
  const p = Math.max(1e-6, Math.min(1 - 1e-6, row[key]));
  return sum - row.happened * Math.log(p) - (1 - row.happened) * Math.log(1 - p);
}, 0) / items.length;
const avg = (items, key) => items.reduce((sum, row) => sum + row[key], 0) / items.length;
const methods = [{ name: '最近30天间隔＋次日冷却（降到平时5%）', key: 'probability' },
  { name: '最近30天间隔＋次日冷却（旧：概率为0）', key: 'hardZero' },
  { name: '最近30天间隔，不封锁次日', key: 'noCooldown' },
  { name: '过去 60 天频率', key: 'baseline' }];
const summarize = items => methods.map(({ name, key }) => ({
  方法: name, 日数: items.length, 实际事件日: items.reduce((sum, row) => sum + row.happened, 0),
  平均预测: +(avg(items, key) * 100).toFixed(1) + '%',
  Brier: +brier(items, key).toFixed(4), LogLoss: +logLoss(items, key).toFixed(4)
}));
console.log(`数据：${data.source}；${events.length} 条自动 reset/重置加备用额度记录，合并后 ${dailyEvents.length} 个事件日。`);
console.log('逐日回放：每天太平洋时间 00:01 预测当日，只使用当时之前的事件；不含帖子。');
console.table(summarize(rows));
console.log('另看回放末尾30天，检验近期经验是否与旧节奏不同；不是独立留出集。');
console.table(summarize(rows.slice(-30)));
console.table(rows.slice(-14).map(row => ({ 日期: row.date, 实际: row.happened,
  模型: +(row.probability * 100).toFixed(1) + '%', 基线: +(row.baseline * 100).toFixed(1) + '%' })));

const postExamples = [
  { label: '速度改进发布', at: '2026-10-05T17:20:29Z', kind: 'new_feature', confidence: 0.95,
    url: 'https://x.com/thsottiaux/status/2107158998495748264' },
  { label: '发放备用 reset', at: '2026-10-07T19:19:17Z', kind: 'banked_credit', confidence: 0.99,
    url: 'https://x.com/thsottiaux/status/2107913674593644711' },
  { label: '全局 reset 预告一', at: '2026-10-10T22:16:20Z', kind: 'reset_planned',
    confidence: 0.99, validUntil: '2026-10-11T07:00:00Z',
    url: 'https://x.com/thsottiaux/status/2109045392684032299' },
  { label: '全局 reset 预告二', at: '2026-10-13T01:03:59Z', kind: 'reset_planned',
    confidence: 0.99, validUntil: '2026-10-13T07:00:00Z',
    url: 'https://x.com/thsottiaux/status/2109812360596865224' }
];
console.log('四条选定帖子按发布时间回放；分类由本次 LLM 标注，样本不是随机抽取。');
console.table(postExamples.map(item => {
  const now = new Date(Date.parse(item.at) + 60_000).toISOString();
  const history = dailyEvents.filter(at => at < now);
  const base = predictReset({ now, timeZone: zone, resetTimes: history });
  const withPost = predictReset({ now, timeZone: zone, resetTimes: history,
    posts: [{ createdAt: item.at, signal: { kind: item.kind,
      confidence: item.confidence, ...(item.validUntil ? { validUntil: item.validUntil } : {}) } }] });
  return { 帖子: item.label, 类别: item.kind,
    当日有自动reset: dailyEvents.some(at => at > now && day.format(new Date(at)) === day.format(new Date(now))),
    仅历史: +(base.todayProbability * 100).toFixed(1) + '%',
    加帖子: +(withPost.todayProbability * 100).toFixed(1) + '%' };
}));

// Real public posts, hand-classified here to exercise the predictor; quota/demand
// below are fixed, illustrative inputs because no private account data is available.
const beforeAt = '2026-10-13T01:30:00Z';
const beforeHistory = dailyEvents.filter(at => at < beforeAt);
const planned = { createdAt: '2026-10-13T01:03:59Z',
  text: 'Global reset landing by EOD PST time. Enjoy',
  url: 'https://x.com/thsottiaux/status/2109812360596865224',
  signal: { kind: 'reset_planned', confidence: 0.99,
    reason: '明确预告当日全局自动 reset', validUntil: '2026-10-13T07:00:00Z' } };
const completed = { createdAt: '2026-10-13T05:06:06Z',
  text: "What would you like with your side of reset? It's done.",
  url: 'https://x.com/thsottiaux/status/2109873287853707513',
  signal: { kind: 'reset_completed', confidence: 0.99,
    reason: '公开报告 reset 已完成；个人额度待核对' } };
const beforeBase = predictReset({ now: beforeAt, timeZone: zone, resetTimes: beforeHistory });
const beforePost = predictReset({ now: beforeAt, timeZone: zone, resetTimes: beforeHistory,
  posts: [planned] });
const afterAt = '2026-10-13T18:30:00Z';
const afterHistory = dailyEvents.filter(at => at < afterAt);
const after = predictReset({ now: afterAt, timeZone: zone, resetTimes: afterHistory,
  posts: [planned, completed] });

// Fixed illustrative account: 24% left, normal refresh in 7 days, no banks.
const input = { weeklyRemaining: 24, weeklyResetDays: 7, weeklyResetHours: 0, resetDates: [], credits: 0 };
const percent = value => +(value * 100).toFixed(1) + '%';
const comparison = [
  { label: '同一时点，只看历史', prediction: beforeBase },
  { label: '加入当晚 reset 预告', prediction: beforePost }
].map(({ label, prediction }) => {
  // The one planning algorithm, as used by the page and the MCP.
  const result = planUsagePath({ input, now: new Date(beforeAt), timeZone: zone, prediction,
    averagePercentPerDay: 12 });
  const counted = result.recommendation.primary?.assumedResetTimes ?? [];
  return { 时点: label, 当天再发生概率: percent(prediction.todayProbability),
    未来48小时: percent(prediction.next48Probability),
    计入的额外reset: counted.length, 建议日均: +result.recommendation.firstAction.dailyPercent.toFixed(1) + '%',
    复查: result.recommendation.firstAction.until };
});
console.log('帖子链接为 X 原帖；类别由 LLM 标注后写入本脚本。');
console.log('下表额度（24%，日均 12%）是固定示例，不是用户账户实测；它只检查真实信号能否影响规划。');
console.table(comparison);
console.log(`已完成帖子入历史后，当地次日再 reset 概率 ${percent(after.todayProbability)}；未来 48 小时 ${percent(after.next48Probability)}。个人额度需重新读取后才能计算新策略。`);
