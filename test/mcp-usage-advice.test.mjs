import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { planUsagePath } from '../src/usage-path-planner.js';
import { predictionFromArchive } from '../src/reset-forecast.js';
import { mcpUsageAdvice,renderMcpUsageAdvice } from '../src/mcp-usage-advice.js';
import { resetProbabilityByHours } from '../src/local-predictor.js';

const now=new Date('2026-10-18T22:35:11.906Z'),HOUR=3600000;
const snapshot=()=>({source:'codex-app-server',readAt:now.toISOString(),ordinaryUsageAllowed:true,
  timeZone:'Europe/Berlin',weekly:{remainingPercent:60,periodHours:168,resetAt:'2026-10-24T21:02:42.000Z'},
  bankedResetCount:1,bankedResetDetailsComplete:true,bankedResets:[{expiresAt:'2026-11-06T23:39:54.000Z'}]});
const archive=JSON.parse(await readFile(new URL('./fixtures/reset-events-2026-10-13.json',import.meta.url),'utf8'));
const prediction=predictionFromArchive({archive,now,timeZone:'Europe/Berlin'}).prediction;
const plan=(extra={})=>planUsagePath({usageSnapshot:snapshot(),now,timeZone:'Europe/Berlin',prediction,
  recommendationMode:'feedback',...extra});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);

test('实际回归：默认采用情景评分策略，不再用两个最可能时点覆盖默认建议',()=>{
  const r=plan(),a=mcpUsageAdvice(r,{prediction,usageSnapshot:snapshot()});
  assert.equal(r.recommendation.primary,null);
  assert.equal(r.strategy.conditional,false);
  assert.deepEqual(r.recommendation.firstAction,r.recommendation.robustFirstAction);
  assert.ok(r.recommendation.firstAction.dailyPercent<=r.averagePercentPerDay);
  // Keep pace: counting conservatively timed resets refills quota at the assumed
  // times, but never retargets the pace; it stays the current pace.
  const alternative=r.recommendation.forecastAlternative;
  near(alternative.firstAction.dailyPercent,r.recommendation.firstAction.dailyPercent);
  const assumedHours=alternative.trace.events.filter(event=>event.kind==='assumed-extra-reset').map(event=>event.atHours);
  assert.equal(assumedHours.length,2);
  const quotaSegments=alternative.trace.segments.filter(segment=>segment.kind==='quota');
  for(const segment of quotaSegments)near(segment.dailyPercent,r.recommendation.firstAction.dailyPercent);
  for(const at of assumedHours)assert.ok(quotaSegments.some(segment=>Math.abs(segment.startHours-at)<1e-6),'假设的 reset 仍然补充额度');
  // So use resumes before the original refresh, unlike the no-reset plan.
  const resumed=quotaSegments[1].startHours;
  assert.ok(resumed<(Date.parse(snapshot().weekly.resetAt)-now.getTime())/HOUR);
  assert.ok(r.recommendation.fallback.segments.some(segment=>segment.kind==='pause'
    &&segment.startHours<=resumed&&segment.endHours>resumed),'不计 reset 的方案此时仍在等待');
  assert.ok(!r.milestones.points.flatMap(point=>point.events).some(event=>event.kind==='assumed-extra-reset'));
  near(a.recommendation.dailyPercent,r.recommendation.firstAction.dailyPercent);
  assert.equal(a.forecastAlternative.selected,false);
  assert.ok(Date.parse(a.recommendation.reviewAt)<Date.parse(a.contingency.selected.depletionAt));
  assert.ok(Date.parse(a.recommendation.reviewAt)<=now.getTime()+24*HOUR);
  assert.equal(a.resources.normalRefreshAt,snapshot().weekly.resetAt);
  near(a.forecast.probabilityBeforeDepletion,resetProbabilityByHours(prediction,
    (Date.parse(a.forecast.depletionAt)-now.getTime())/HOUR));
  assert.equal(a.contingency.selected.waits.length,1,'内部复查点不应切出多个假停用终点');
  assert.equal(a.contingency.selected.waits[0].to,snapshot().weekly.resetAt);
  const bridge=a.contingency.continuityAlternative;
  assert.ok(bridge.bankUses.length>0);
  assert.equal(bridge.bankUses[0].at,a.contingency.selected.depletionAt);
  assert.equal(bridge.bankUses[0].quotaBefore,0);
  assert.equal(bridge.bankUses[0].condition,'no-new-reset-and-quota-exhausted');
  assert.ok(bridge.stages.every(stage=>Math.abs(stage.dailyPercent-a.recommendation.dailyPercent)<1e-6),
    '应急备用方案不得在兑换后悄悄加速、继续押下一个预测');
  near((Date.parse(bridge.normalRefreshAt)-Date.parse(bridge.bankUses.at(-1).at))/HOUR,168);
  assert.ok(bridge.waits.length>0,'备用也不能覆盖所有后续使用时必须保留该后果');
  for(const language of ['en','zh-CN']) {
    const text=renderMcpUsageAdvice(a,{language});
    assert.doesNotMatch(text,/undefined|NaN|55\.6%|session|Fast|Credits/);
    assert.match(text,language==='en' ? /review|wait/i : /复查|等待/);
    assert.match(text,language==='en' ? /later gap/ : /仍会有空档/);
  }
});

test('计入 reset 的计划在文字中标明假设时刻和未发生时的安排',()=>{
  const r=plan({recommendationMode:'forecast-preview'}),a=mcpUsageAdvice(r,{prediction});
  assert.equal(a.basis,'conditional-forecast-preview');
  assert.equal(a.forecastAlternative.selected,true);
  assert.equal(a.forecastAlternative.assumedResetTimes.length,2);
  assert.match(renderMcpUsageAdvice(a),/counts likely extra resets \(.+ and .+, at conservative times\)/);
  assert.match(renderMcpUsageAdvice(a,{language:'zh-CN'}),/较有把握的额外 reset/);
  assert.throws(()=>plan({recommendationMode:'unknown'}),/recommendation mode/);
});

test('关闭预测仅使用真实资源，备用只在已耗尽或期限约束触发，不兑换过期库存',()=>{
  const r=plan({prediction:null}),a=mcpUsageAdvice(r,{usageSnapshot:snapshot()});
  assert.equal(a.forecast.enabled,false);
  assert.equal(a.forecast.probabilityBeforeDepletion,null);
  assert.equal(a.forecastAlternative,undefined);
  assert.equal(a.resources.bankedCount,1);
  for(const bank of a.contingency.selected.bankUses) {
    assert.ok(Date.parse(bank.at)<Date.parse(bank.expiresAt));
    if(bank.reason==='quota-exhausted')near(bank.quotaBefore,0);
  }
});

test('无备用、明确保留的备用不能在应急方案中被凭空使用',()=>{
  for(const held of [false,true]) {
    const s=snapshot();if(!held){s.bankedResets=[];s.bankedResetCount=0;}
    const r=plan({usageSnapshot:s,prediction:null,heldResetIndices:held ? [0] : []});
    const a=mcpUsageAdvice(r,{usageSnapshot:s});
    assert.equal(a.contingency.selected.bankUses.length,0);
    assert.equal(a.contingency.continuityAlternative.bankUses.length,0);
    assert.ok(a.contingency.selected.waits.length);
  }
});

test('新窗口不编造速度，未知备用库存不伪造可兑换日期',()=>{
  const s=snapshot();s.weekly={remainingPercent:100,periodHours:168,
    resetAt:new Date(now.getTime()+167.99*HOUR).toISOString()};
  s.bankedResetDetailsComplete=false;s.bankedResets=[{expiresAt:null}];
  const r=plan({usageSnapshot:s,prediction:null}),a=mcpUsageAdvice(r,{usageSnapshot:s});
  assert.equal(a.status,'needs-usage-estimate');
  assert.equal(a.recommendation.dailyPercent,null);
  assert.equal(a.currentUsage.dailyPercent,null);
  assert.equal(a.resources.inventoryComplete,false);
  assert.equal(a.resources.knownBankDeadlines.length,0);
  assert.ok(a.knownResourceDailyPercent>0);
  assert.match(renderMcpUsageAdvice(a),/approximate daily/);
});

test('周额度尚有余量也不能忽略已耗尽的短窗口',()=>{
  const s=snapshot();s.short={remainingPercent:0,periodHours:5,resetAt:new Date(now.getTime()+2*HOUR).toISOString()};
  const r=plan({usageSnapshot:s,prediction:null}),a=mcpUsageAdvice(r,{usageSnapshot:s});
  assert.equal(a.status,'blocked');
  assert.equal(a.recommendation.dailyPercent,0);
  assert.equal(a.recommendation.until,s.short.resetAt);
  assert.match(renderMcpUsageAdvice(a),/Short-window quota is exhausted/);
  assert.doesNotMatch(renderMcpUsageAdvice(a),/Suggested consumption/);
});

test('不同使用日约束的结果只给实际可用时段，休息不伪装成断供',()=>{
  for(const usageStrategy of ['weekdays','weekend-focus','maximize']) {
    const r=plan({prediction:null,usageStrategy}),a=mcpUsageAdvice(r);
    assert.ok(a.recommendation.reviewAt);
    if(r.phasePlans[0].plannedRest) {
      assert.equal(a.recommendation.action,'rest');
      assert.match(renderMcpUsageAdvice(a),/Rest until/);
    }
    assert.deepEqual(a.stages.map(s=>s.dailyPercent),r.phasePlans.map(s=>s.dailyPercent));
  }
});

test('零额度的建议必须是实际使用可用备用或等待，不能先用预测额度',()=>{
  for(const banks of [0,1]) {
    const s=snapshot();s.weekly.remainingPercent=0;
    if(!banks){s.bankedResets=[];s.bankedResetCount=0;}
    const r=plan({usageSnapshot:s,prediction:null}),a=mcpUsageAdvice(r,{usageSnapshot:s});
    assert.equal(a.recommendation.action,banks ? 'use-banked-reset-now' : 'wait');
    if(banks) {
      assert.equal(a.recommendation.bankedResetNow.index,0);
      assert.equal(a.contingency.selected.bankUses[0].at,now.toISOString());
    }else assert.equal(a.recommendation.dailyPercent,0);
  }
});

test('期限和人工必须使用的约束保留真实覆盖损失，不错误声称等到零再兑换',()=>{
  const s=snapshot();s.bankedResets=[{expiresAt:new Date(now.getTime()+8*HOUR).toISOString()}];
  const r=plan({usageSnapshot:s,prediction:null,requiredResetIndices:[0]});
  const a=mcpUsageAdvice(r,{usageSnapshot:s});
  const use=a.contingency.selected.bankUses[0];
  assert.ok(use.quotaBefore>0);
  assert.equal(use.condition,'expiry-or-explicit-constraint');
  assert.ok(Date.parse(use.at)<Date.parse(use.expiresAt));
  assert.match(renderMcpUsageAdvice(a,{language:'zh-CN'}),/期限约束/);
});

test('精简输出保留真实覆盖状态，英文未知库存提示不夹带中文或假装帖子完整',()=>{
  const r=plan(),s=snapshot();s.bankedResetDetailsComplete=false;
  const sourceStatus={history:'cached',social:'unavailable',checkedAt:now.toISOString()};
  const a=mcpUsageAdvice(r,{prediction,usageSnapshot:s,sourceStatus});
  assert.deepEqual(a.forecast.sourceStatus,sourceStatus);
  const text=renderMcpUsageAdvice(a);
  assert.match(text,/coverage is incomplete|unavailable/);
  assert.match(text,/deadlines are incomplete/);
  assert.match(text,/history is cached/);
  assert.doesNotMatch(text,/[\u3400-\u9fff]/);
});
