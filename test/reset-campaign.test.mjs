import test from 'node:test';
import assert from 'node:assert/strict';
import { RESET_CAMPAIGNS,describeResetCampaign,selectResetCampaign } from '../src/reset-campaign.js';
import { resetIntervalModel,intervalSurvival,renewIntervalDistribution } from '../src/reset-interval-model.js';
import { predictReset,resetProbabilityByHours } from '../src/local-predictor.js';
import { predictionFromArchive } from '../src/reset-forecast.js';
import { collectLiveResetEvidence } from '../src/live-reset-evidence.js';
import { followingResetProbabilityByHours } from '../src/reset-sequence-forecast.js';

const DAY=86400000,HOUR=3600000;
const campaign=RESET_CAMPAIGNS[0],now=Date.parse('2026-10-18T20:00:00Z');
const dates=['2026-07-01','2026-08-01','2026-09-01','2026-09-29','2026-10-02',
  '2026-10-04','2026-10-06','2026-10-09','2026-10-12','2026-10-15','2026-10-18'];
const times=dates.map(date=>Date.parse(date+'T18:00:00Z'));
const active=describeResetCampaign(campaign,now);
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);

test('活动证据独立保存，公告前不偷看未来，结束按发布者日期且包含夏令时切换',()=>{
  assert.equal(selectResetCampaign({now:Date.parse('2026-10-04T20:33:42Z')}),null);
  assert.equal(selectResetCampaign({now:now}).status,'active');
  assert.equal(describeResetCampaign(campaign,Date.parse(campaign.endsAt)-1).status,'active');
  assert.equal(describeResetCampaign(campaign,Date.parse(campaign.endsAt)).status,'ended');
  near((Date.parse(campaign.endsAt)-Date.parse(campaign.startsAt))/HOUR,28*24+1);
  assert.throws(()=>describeResetCampaign({...campaign,endsAt:campaign.startsAt},now),/起止时间/);
});

test('当前间隔只取活动内完整间隔，不混入边界外或跨开始日期的间隔',()=>{
  const m=resetIntervalModel(times,now,campaign.timeZone,undefined,active);
  assert.equal(m.source,'campaign-intervals');
  assert.equal(m.campaignEventCount,5);
  assert.equal(m.sampleCount,4);
  assert.deepEqual(m.intervals,[3,3,3,3]);
  assert.equal(m.meanIntervalDays,3);
  assert.equal(m.meanIntervalConfidence.sampleCount,4);
  assert.equal(m.sampleFrom,'2026-10-06T18:00:00.000Z');
  assert.equal(m.sampleTo,'2026-10-18T18:00:00.000Z');
  assert.ok(m.historicalMeanIntervalDays>m.meanIntervalDays);
});

test('活动内只有一个完整间隔也不混入旧间隔；没有完整间隔时明确标出回退',()=>{
  const first=Date.parse('2026-10-10T20:00:00Z');
  const fit=resetIntervalModel(times.filter(t=>t<=first),first,campaign.timeZone,undefined,describeResetCampaign(campaign,first));
  assert.equal(fit.source,'campaign-intervals');
  assert.equal(fit.meanIntervalDays,3);
  assert.equal(fit.meanIntervalConfidence,null);
  const early=Date.parse('2026-10-07T20:00:00Z');
  const fallback=resetIntervalModel(times.filter(t=>t<=early),early,campaign.timeZone,undefined,describeResetCampaign(campaign,early));
  assert.notEqual(fallback.source,'campaign-intervals');
  assert.equal(fallback.campaignEventCount,1);
  assert.equal(fallback.campaignIntervalCount,0);
  assert.equal(fallback.selectionReason,'campaign-has-no-complete-interval');
});

test('活动结束后不沿用高频活动：无新间隔用非活动历史，有新间隔才用新阶段',()=>{
  const end=Date.parse('2026-11-03T20:00:00Z');
  const m=resetIntervalModel(times,end,campaign.timeZone,undefined,describeResetCampaign(campaign,end));
  assert.equal(m.source,'non-campaign-historical-intervals');
  assert.equal(m.selectionReason,'campaign-ended');
  assert.ok(m.meanIntervalDays>3);
  assert.equal(m.sampleTo,'2026-10-04T18:00:00.000Z');
  const later=Date.parse('2026-11-10T20:00:00Z');
  const learned=resetIntervalModel([...times,Date.parse('2026-11-03T18:00Z'),Date.parse('2026-11-10T18:00Z')],
    later,campaign.timeZone,undefined,describeResetCampaign(campaign,later));
  assert.equal(learned.source,'recent-30-day-intervals');
  assert.deepEqual(learned.intervals,[7]);
});

test('预测跨活动结束切换非活动历史，生存函数连续；后继假设重新定位边界',()=>{
  const d=resetIntervalModel(times,now,campaign.timeZone,undefined,active).distribution;
  const boundary=d.regime.switchAgeDays,after=d.regime.afterDistribution;
  near(intervalSurvival(d,boundary+3)/intervalSurvival(d,boundary),
    intervalSurvival(after,boundary+3)/intervalSurvival(after,boundary));
  assert.ok(Math.abs(intervalSurvival(d,boundary+1e-6)-intervalSurvival(d,boundary-1e-6))<1e-6);
  const renewed=renewIntervalDistribution(d,Date.parse(campaign.endsAt)+DAY);
  near(intervalSurvival(renewed,3),intervalSurvival(after,3));
  const first=Date.parse(campaign.endsAt)+DAY;
  const prediction={model:'local-recent-intervals-v5',enforceResetCooldown:false,timeZone:'UTC',
    resetTimeMode:{pointAt:new Date(first).toISOString()},
    evidence:{intervalDistribution:d,intervalModel:{meanIntervalDays:3}}};
  near(followingResetProbabilityByHours(prediction,now,(first-now)/HOUR+72),1-intervalSurvival(after,3));
});

test('没有非活动历史时不编造结束后的节奏，未解释的概率质量留在尾部',()=>{
  const subset=times.filter(t=>t>=Date.parse(campaign.startsAt));
  const d=resetIntervalModel(subset,now,campaign.timeZone,undefined,active).distribution;
  assert.equal(d.regime.afterSource,'unavailable');
  near(intervalSurvival(d,d.regime.switchAgeDays),intervalSurvival(d,100));
});

test('档案连入活动统计及全历史钟点；没有近期帖子仍识别活动，纯备用不计数',()=>{
  const events=times.map(at=>({at:new Date(at).toISOString(),kind:'automatic'}));
  events.push({at:'2026-10-08T18:00:00Z',kind:'banked'});
  const p=predictionFromArchive({archive:{retrievedAt:'2026-10-18',events,posts:[]},now:new Date(now),timeZone:'Asia/Shanghai'}).prediction;
  assert.equal(p.evidence.campaign.id,campaign.id);
  assert.equal(p.evidence.campaignActive,true);
  assert.equal(p.evidence.intervalModel.source,'campaign-intervals');
  assert.equal(p.evidence.intervalModel.campaignEventCount,5);
  assert.equal(p.releaseClock.sampleCount,times.length);
  assert.equal(p.displayTimeZone,'Asia/Shanghai');
  const clone=JSON.parse(JSON.stringify(p));
  let previous=0;
  for(let hours=0;hours<=24*35;hours+=6) {
    const chance=resetProbabilityByHours(p,hours);
    assert.ok(Number.isFinite(chance)&&chance>=previous&&chance<=1);
    near(chance,resetProbabilityByHours(clone,hours));
    previous=chance;
  }
});

test('纯库调用没有活动证据不猜起止，Day帖子不能凭空定义28天活动',()=>{
  const p=predictReset({now:new Date(now).toISOString(),timeZone:'UTC',resetTimes:times.map(t=>new Date(t).toISOString()),
    posts:[{createdAt:new Date(now).toISOString(),text:'Day 14/ Hello',signal:{kind:'unknown',confidence:0}}]});
  assert.equal(p.evidence.campaign,null);
  assert.equal(p.evidence.campaignActive,false);
  assert.equal(p.evidence.intervalModel.source,'recent-30-day-intervals');
});

test('离线刷新保留活动证据，不受72小时帖子过滤影响',async()=>{
  const custom={...campaign,id:'custom-evidence',name:'Custom campaign'};
  const snapshot=await collectLiveResetEvidence({now:new Date(now),fallbackArchive:{retrievedAt:'2026-10-18',events:[],campaigns:[custom]},
    fetchImpl:async()=>{throw new Error('offline');},classifyWithLLM:false});
  assert.equal(snapshot.campaigns.find(c=>c.id===custom.id).sourceUrl,campaign.sourceUrl);
});
