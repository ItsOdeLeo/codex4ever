import test from 'node:test';
import assert from 'node:assert/strict';
import { planUsagePath } from '../src/usage-path-planner.js';
import { publicResetScenarios,simulateResetPolicy } from '../src/reset-policy-search.js';
import { resetProbabilityByHours } from '../src/local-predictor.js';
import { createUsagePlannerState,updateUsagePlanner } from '../src/usage-planner-state.js';
import { mcpUsageAdvice,renderMcpUsageAdvice } from '../src/mcp-usage-advice.js';
import { renderAvailabilityControls } from '../src/components/availability-controls.js';
import { layoutStrategyTree,renderStrategyTree } from '../src/strategy-tree-layout.js';

const now=new Date('2026-10-18T12:00:00Z'),HOUR=3600000;
const input={weeklyRemaining:40,weeklyResetDays:4,weeklyResetHours:0,resetDates:[]};
const prediction={model:'synthetic-forecast',todayEndHours:24,todayProbability:.1,laterGivenNoReset:.9,
  next48Probability:.91,evidence:{dailyFrequency:.1},
  resetTimeMode:{pointAt:'2026-10-20T02:00:00Z',pointHours:38,fromHours:37.5,toHours:38.5,probability:.04},
  followingResetEstimate:{pointAt:'2026-10-23T02:00:00Z',pointHours:110,fromHours:109.5,toHours:110.5,
    probability:.04,cumulativeProbability:.4,conditionalOn:'2026-10-20T02:00:00Z'}};
const plan=(extra={})=>planUsagePath({input,now,timeZone:'UTC',averagePercentPerDay:20,prediction,
  usageStrategy:'keep-available',...extra});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);

test('同样余额与刷新，额外 reset 概率直接影响乐观日均预算，低概率不能凭空支持加速',()=>{
  const conservative=plan({availabilityMode:'cautious'}),optimistic=plan();
  near(conservative.recommendation.firstAction.dailyPercent,8.75);
  near(optimistic.recommendation.firstAction.dailyPercent,20);
  assert.equal(optimistic.recommendation.availability.forecastUsed,true);
  assert.equal(optimistic.recommendation.availability.status,'on-track');
  assert.equal(conservative.recommendation.availability.status,'too-fast');
  for(const low of [null,{...prediction,todayProbability:0,laterGivenNoReset:0,next48Probability:0}]) {
    const r=plan({prediction:low});
    near(r.recommendation.firstAction.dailyPercent,8.75);
    assert.equal(r.recommendation.availability.forecastUsed,false);
    assert.ok(!r.milestones.points.flatMap(p=>p.events).some(e=>e.kind==='assumed-extra-reset'));
  }
  assert.equal(optimistic.recommendation.primary,null,'即使网页默认preview，也不能把预测当已发生');
  assert.equal(optimistic.strategy.conditional,false);
  const target=optimistic.recommendation.availability;
  near(target.probabilityOfResetByReview,resetProbabilityByHours(prediction,(Date.parse(target.reviewAt)-now)/HOUR));
  // Shared rule: aim where 75% of the chance before the refresh (96h) has occurred.
  const beforeRefresh=resetProbabilityByHours(prediction,96);
  assert.ok(beforeRefresh>=.6);
  assert.ok(target.probabilityOfResetByReview>=.75*beforeRefresh-1e-9);
  assert.ok(target.probabilityOfResetByReview<.75*beforeRefresh+.05,'按统一规则的保守时刻，而非 80% 时刻');
  near(optimistic.phasePlans[0].nextResetOpportunity.probability,target.probabilityOfResetByReview);
  assert.equal(optimistic.phasePlans[0].nextResetOpportunity.until,target.reviewAt);
});

test('预测没发生时在耗尽前减量，真实额度守恒并留余量；正常刷新仍在输入时间',()=>{
  const r=plan(),g=r.recommendation.availability,trace=r.recommendation.fallback;
  assert.ok(Date.parse(g.reviewAt)<Date.parse(g.currentPaceDepletionAt));
  assert.ok(g.ifNoReset.dailyPercent>0&&g.ifNoReset.dailyPercent<g.suggestedDailyPercent);
  near(g.reserveAtReview,trace.segments.find(s=>s.endAt===g.reviewAt).remainingAfter);
  near(trace.pauseHours,0);assert.equal(trace.banksUsed,0);assert.equal(trace.publicCount,0);
  const normal=trace.events.find(e=>e.kind==='normal-refresh');
  assert.equal(normal.at,'2026-10-22T12:00:00.000Z');
  assert.ok(normal.overwrittenPercent>0);
  for(const s of trace.segments) {
    near(s.remainingBefore-s.remainingAfter,s.dailyPercent*(s.endHours-s.startHours)/24);
    assert.ok(s.remainingAfter>0);
  }
  near(40+100*trace.events.filter(e=>e.kind!=='expiry').length
    -trace.events.reduce((sum,e)=>sum+(e.overwrittenPercent??0),0)-trace.work,trace.remainingQuota);
  const html=renderStrategyTree(layoutStrategyTree(r,{prediction,viewportWidth:900,locale:'en'}),String);
  assert.doesNotMatch(html,/NaN|undefined/);
});

test('只响应已发生的重置，首次前不同未来路径的建议相同；续发后再次规划且每次推后七天',()=>{
  const r=plan({input:{...input,resetDates:['2026-11-07']}}),search=r.recommendation;
  const base={...r,normalResetInHours:96};
  const forecast=publicResetScenarios({prediction,now:r.now});
  const simulate=events=>simulateResetPolicy({base,forecast,scenario:{events},policy:search.selected.policy,targetDailyPercent:20});
  const received=simulate([30,80]),missed=simulate([]);
  assert.deepEqual(received.segments.filter(s=>s.endHours<30),missed.segments.filter(s=>s.endHours<30));
  assert.equal(received.banksUsed,0);
  assert.equal(received.publicCount,2);
  for(const e of received.events.filter(e=>e.kind!=='expiry'))near((Date.parse(e.nextNormalResetAt)-Date.parse(e.at))/HOUR,168);
  assert.ok(received.segments.every(s=>s.remainingAfter>0));
});

test('备用只在真缺额／期限约束使用；零额度、有多个备用、临期、保留和指定均守恒',()=>{
  const empty=plan({input:{...input,weeklyRemaining:0,resetDates:['2026-11-07']}});
  const bank=empty.recommendation.fallback.events.find(e=>e.kind==='backup');
  assert.equal(bank.atHours,0);near(bank.overwrittenPercent,0);
  const blocked=plan({input:{...input,weeklyRemaining:0}});
  assert.equal(blocked.recommendation.firstAction.dailyPercent,0);
  assert.equal(blocked.recommendation.availability.status,'empty');
  assert.equal(blocked.recommendation.fallback.banksUsed,0);
  for(const quota of [1,10,40,83,100])for(const daily of [5,20,100])for(const mode of ['cautious','optimistic']) {
    const r=plan({input:{...input,weeklyRemaining:quota,resetDates:['2026-10-19','2026-11-07']},
      averagePercentPerDay:daily,availabilityMode:mode});
    const t=r.recommendation.fallback;
    for(const s of t.segments)near(s.remainingBefore-s.remainingAfter,s.dailyPercent*(s.endHours-s.startHours)/24);
    assert.ok(t.segments.every(s=>s.remainingAfter>=0));
    const banks=t.events.filter(e=>e.kind==='backup');
    assert.equal(new Set(banks.map(e=>e.resetIndex)).size,banks.length);
    for(const e of banks)assert.ok(Date.parse(e.at)<Date.parse(e.expiresAt));
  }
  const required=plan({input:{...input,resetDates:['2026-10-19']},requiredResetIndices:[0]});
  assert.ok(required.recommendation.fallback.events.some(e=>e.kind==='backup'&&e.required));
  const held=plan({input:{...input,resetDates:['2026-10-19']},heldResetIndices:[0]});
  assert.equal(held.recommendation.fallback.banksUsed,0);
  const capped=plan({input:{...input,resetDates:['2026-10-19']},requiredResetIndices:[0],dailyCapacityPercent:2});
  assert.ok(capped.recommendation.fallback.segments.every(s=>s.dailyPercent<=2));
});

test('提醒开关只改变提醒，不改策略、概率、日期轴；MCP文字和页面同源且不冒充后台运行',()=>{
  let state=updateUsagePlanner(createUsagePlannerState({timeZone:'UTC',usageStrategy:'keep-available',availabilityMode:'cautious'}),
    {type:'new-snapshot',input,now,prediction});
  const initial=state;
  assert.equal(state.result.recommendation.availability.notification.shouldNotify,false);
  state=updateUsagePlanner(state,{type:'toggle-alerts'});
  assert.equal(state.result.recommendation.availability.notification.shouldNotify,true);
  assert.equal(state.result.recommendation.selected,initial.result.recommendation.selected);
  assert.equal(state.result.phasePlans,initial.result.phasePlans);
  assert.equal(state.displayEndHours,initial.displayEndHours);
  const advice=mcpUsageAdvice(state.result,{prediction});
  assert.deepEqual(advice.availability,state.result.recommendation.availability);
  assert.equal(advice.availability.notification.trigger,'on-plan-check');
  for(const language of ['en','zh-CN']) {
    const text=renderMcpUsageAdvice(advice,{language});
    assert.match(text,language==='en' ? /Pace alert/ : /用量提醒/);
    assert.doesNotMatch(text,/undefined|NaN/);
    const html=renderAvailabilityControls(advice.availability,{locale:language,mode:'cautious',alertsEnabled:true},String);
    assert.match(html,/data-toggle-pace-alerts aria-pressed="true"/);
    assert.doesNotMatch(html,/undefined|NaN/);
  }
  const optimistic=updateUsagePlanner(state,{type:'set-availability-mode',mode:'optimistic'});
  assert.equal(optimistic.snapshot,state.snapshot);assert.equal(optimistic.displayEndHours,state.displayEndHours);
  assert.ok(optimistic.result.recommendation.firstAction.dailyPercent>state.result.recommendation.firstAction.dailyPercent);
  assert.equal(optimistic.intent.alertsEnabled,true);
  const off=updateUsagePlanner(optimistic,{type:'toggle-forecast'});
  near(off.result.recommendation.firstAction.dailyPercent,state.result.recommendation.firstAction.dailyPercent);
  const preview=updateUsagePlanner(optimistic,{type:'toggle-assumption',sequence:2});
  assert.equal(preview.intent.usageStrategy,'balanced');assert.equal(preview.intent.resetCountOverride,2);
  assert.equal(preview.result.forecastScenario.secondSelected,true);
  assert.throws(()=>plan({availabilityMode:'invented'}),/availability mode/);
});
