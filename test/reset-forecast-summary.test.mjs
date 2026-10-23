import test from 'node:test';
import assert from 'node:assert/strict';
import { renderResetForecastSummary } from '../src/reset-forecast-summary.js';
import { RESET_CAMPAIGNS } from '../src/reset-campaign.js';

const now = new Date('2026-10-16T06:46:00Z');
const timeZone = 'Europe/Berlin';
const prediction = { calibrated: false, evidence: { intervalModel: {
  source: 'recent-30-day-intervals', meanIntervalDays: 3.70143, windowDays: 30, recentIntervalCount: 5,
  meanIntervalConfidence: { level: .95, lowDays: 1.57475, highDays: 5.82810 }
} }, nextResetWindow: { coverage: .8, from: '2026-10-17T08:30:00Z',
  medianAt: '2026-10-19T09:36:00Z', to: '2026-10-22T21:27:00Z' } };
const source = { available: true, prediction, lastResetAt: '2026-10-15T06:28:00Z', daysSinceReset: 1.0125,
  lastResetSource: 'https://x.com/thsottiaux/status/100', dataAsOf: '2026-10-16',
  checkedAt: now.toISOString(), coverage: { history: { status: 'live' } },
  latestResetMention: { sourceUrl: 'https://x.com/thsottiaux/status/101', createdAt: '2026-10-16T04:30:00Z',
    activityType: 'reply', text: 'Let us try.', signal: { kind: 'unknown' } } };
const render = extra => renderResetForecastSummary({ source, prediction, now, timeZone, ...extra });

test('预测关键数据映射到固定行：实际 reset、近期均值及95%区间与下次80%窗口分别显示', () => {
  const html = render();
  assert.match(html,/>10\/15 08:28<\/a><small>1.01 天前/);
  assert.match(html,/>3.7 天<small>近 30 天 · 5 个完整间隔/);
  assert.match(html,/平均间隔的 95% 置信区间<\/dt><dd>1.57 – 5.83 天/);
  assert.match(html,/下次预计（中位）<\/dt><dd>10\/19 11:36/);
  assert.match(html,/80% 可能区间<\/dt><dd>10\/17 10:30 – 10\/22 23:27/);
  assert.match(html,/Tibo 最近相关回复/);
  assert.match(html,/>10\/16 06:30<\/a> · 暂未识别<q>Let us try\.<\/q>/);
  assert.match(html,/数据更新于 10\/16 08:46（本地时间） · 模型未校准/);
});

test('关闭预测保留历史统计，数据不足或超出预测范围不编造置信区间和日期', () => {
  const disabled = render({ prediction: null });
  assert.match(disabled,/>3.7 天<small>/);
  assert.match(disabled,/下次 reset 预测<\/dt><dd>已关闭/);
  assert.doesNotMatch(disabled,/next-reset-median|next-reset-window/);
  const sparse = structuredClone(source);
  sparse.prediction.evidence.intervalModel.meanIntervalConfidence = null;
  sparse.prediction.nextResetWindow = { coverage: .8, from: null, medianAt: null, to: null };
  assert.match(render({ source: sparse, prediction: sparse.prediction }), /样本不足，暂不估计/);
  assert.match(render({ source: sparse, prediction: sparse.prediction }), /80% 可能区间<\/dt><dd>暂无法估计/);
  const missing = render({ source: { available: false, reason: '历史数据已过期，暂不预测' }, prediction: null });
  assert.match(missing, /历史数据已过期，暂不预测/);
  assert.doesNotMatch(missing, /NaN|Invalid Date|95%|80%/);
});

test('旧历史回退不能写成近期样本，跨年时间显示年份；活动规则显示截止及假设', () => {
  const fallback = structuredClone(source);
  fallback.prediction.evidence.intervalModel.source = 'historical-interval-fallback';
  fallback.prediction.evidence.intervalModel.intervals = [3, 4, 5];
  fallback.prediction.evidence.hardRules = [{ kind: 'campaign-feature-day', day: 11, applied: true,
    probability: 0, until: '2026-10-16T07:00:00Z', basis: 'user-requested-hard-assumption' }];
  fallback.prediction.nextResetWindow.to = '2027-01-01T10:00:00Z';
  const html = render({ source: fallback, prediction: fallback.prediction });
  assert.match(html, /历史回退 · 3 个完整间隔/);
  assert.doesNotMatch(html, /近 30 天/);
  assert.match(html, /2027\/01\/01 11:00/);
  assert.match(html, /Day 11 功能帖 · 0%<small>截至 10\/16 09:00 · 用户设定规则/);
});

test('公开帖子只按文本显示，未知分类不当成 reset 承诺，链接不执行网页代码', () => {
  const hostile = structuredClone(source);
  hostile.latestResetMention.text = '<img src=x onerror="alert(1)">';
  const html = render({ source: hostile });
  assert.match(html, /暂未识别<q>&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.doesNotMatch(html, /<img/);
  hostile.latestResetMention.sourceUrl = 'javascript:alert(1)';
  hostile.lastResetSource = 'javascript:alert(1)';
  assert.doesNotMatch(render({ source: hostile }), /href="javascript:/);
});

test('活动范围、当前间隔样本及全历史钟点分别显示，全部时间转换到观看者时区',()=>{
  const campaignSource=structuredClone(source);
  const p=campaignSource.prediction;
  p.evidence.campaign={...RESET_CAMPAIGNS[0],status:'active'};
  Object.assign(p.evidence.intervalModel,{source:'campaign-intervals',meanIntervalDays:2.6818,
    sampleCount:4,campaignEventCount:5,selectionReason:null});
  p.releaseClock={sampleScope:'all-history',sampleCount:56,typicalTime:'18:00',
    typicalTimeAt:'2026-10-16T01:00:00Z',timeZone:'America/Los_Angeles'};
  const html=render({source:campaignSource,prediction:p});
  assert.match(html,/28 天改进或 reset<\/a> · 进行中/);
  assert.match(html,/10\/05 09:00 – 11\/02 09:00（按 Day 1 推算）/);
  assert.match(html,/2.68 天<small>本次活动 5 次 reset · 4 个完整间隔/);
  assert.match(html,/常见发布时间<\/dt><dd>03:00<small>基于全部 56 个 reset 日 · 本地时间（Tibo 当地时间 18:00 (PDT|GMT-7)）/);
  assert.match(html,/（本地时间）/,'时间都换算成访问者的本地时间');
  assert.doesNotMatch(html,/近 30 天/);
  const shanghai=render({source:campaignSource,prediction:p,timeZone:'Asia/Shanghai'});
  assert.match(shanghai,/常见发布时间<\/dt><dd>09:00/);
  p.evidence.campaign.status='ended';
  assert.match(render({source:campaignSource,prediction:null}),/28 天改进或 reset<\/a> · 已结束/);
});

test('活动样本不足时不把历史回退均值当成活动均值',()=>{
  const sparse=structuredClone(source);
  sparse.prediction.evidence.campaign={...RESET_CAMPAIGNS[0],status:'active'};
  sparse.prediction.evidence.intervalModel.selectionReason='campaign-has-no-complete-interval';
  assert.match(render({source:sparse}),/近 30 天 · 5 个完整间隔 · 活动样本不足，暂回退/);
});

test('已宣布的 reset：三个概率块合成一个“已宣布 · 某时前”',()=>{
  const now=new Date('2026-10-23T08:00:00Z');
  const prediction={next12Probability:.99,next24Probability:.992,next48Probability:.995,
    evidence:{scheduledResetAt:'2026-10-23T17:00:00.000Z'}};
  const html=renderResetForecastSummary({source:{available:true,prediction},prediction,timeZone:'UTC',now,locale:'en'});
  assert.match(html,/data-forecast-horizon="announced"/);
  assert.match(html,/Announced reset/);
  assert.match(html,/By 23 Oct, 17:00/);
  assert.doesNotMatch(html,/data-forecast-horizon="12"/);
  // Once the announced time has passed, the chance tiles return.
  const later=renderResetForecastSummary({source:{available:true,prediction},prediction,timeZone:'UTC',
    now:new Date('2026-10-23T18:00:00Z'),locale:'en'});
  assert.match(later,/data-forecast-horizon="12"/);
});
