import test from 'node:test';
import assert from 'node:assert/strict';
import { planUsagePath } from '../src/usage-path-planner.js';
import { resetProbabilityByHours } from '../src/local-predictor.js';
import { renewedResetProbabilityByHours } from '../src/reset-sequence-forecast.js';
import { layoutStrategyTree,renderStrategyTree } from '../src/strategy-tree-layout.js';

const HOUR=3600000,now=new Date('2026-10-16T08:00:00Z'),timeZone='UTC';
const at=hours=>new Date(now.getTime()+hours*HOUR).toISOString();
const prediction={model:'local-frequency-llm-v3',timeZone,enforceResetCooldown:false,
  todayEndHours:16,todayProbability:.1,laterGivenNoReset:.2,next48Probability:.28,
  evidence:{daysSinceReset:1,dailyFrequency:.2,ageHazards:[],intervalModel:{meanIntervalDays:4}},
  resetTimeMode:{pointAt:at(6),pointHours:6,fromHours:5.5,toHours:6.5,nearbyHours:1,probability:.04},
  followingResetEstimate:{pointAt:at(42),pointHours:42,fromHours:41.5,toHours:42.5,nearbyHours:1,
    probability:.04,cumulativeProbability:.4,conditionalOn:at(6)}};
const input={weeklyRemaining:40,weeklyResetDays:6,weeklyResetHours:10,resetDates:[]};
const plan=extra=>planUsagePath({input,now,timeZone,prediction,averagePercentPerDay:60,
  ...extra});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
const assumedHours=result=>result.recommendation.primary.assumedResetTimes.map(time=>(Date.parse(time)-now.getTime())/HOUR);

test('第二次假设后的阶段计算第三次机会，不借用首次累计概率，不改变已选用量',()=>{
  const result=plan({assumedResetCount:2}),[,second]=assumedHours(result);
  const phase=result.phasePlans.find(phase=>phase.startHours===second),opportunity=phase.nextResetOpportunity;
  assert.equal(opportunity.nextExtraResetSequence,3);
  assert.equal(opportunity.previousExtraResetAt,at(second));
  assert.equal(opportunity.untilHours,second+168);
  near(opportunity.probability,1-Math.exp(-168/96));
  near(opportunity.probability,renewedResetProbabilityByHours(prediction,now,at(second),second+168));
  assert.notEqual(opportunity.probability,resetProbabilityByHours(prediction,second+168));
  assert.equal(phase.dailyPercent,60);
  assert.equal(result.milestones.points.filter(point=>point.reasons.includes('depletion')).at(-1).hours,second+40);
  // The chart no longer repeats these chances under each phase; the markers
  // above carry cumulative chances. The plan keeps them for text advice.
  const html=renderStrategyTree(layoutStrategyTree(result,{prediction}),String);
  assert.doesNotMatch(html,/data-reset-opportunity|phase-probability-until|至少一次额外重置：/);
  assert.doesNotMatch(html,/建议增加用量|建议减少用量/);
  const off=plan({prediction:null});
  assert.ok(off.phasePlans.every(phase=>!phase.nextResetOpportunity));
});

test('首次假设后的第二次机会以首次为起点重新计时，与第二条分布同一条件',()=>{
  const result=plan({input:{...input,resetDates:['2026-11-07']},assumedResetCount:1}),[first]=assumedHours(result);
  const phase=result.phasePlans.find(phase=>phase.startHours===first),opportunity=phase.nextResetOpportunity;
  assert.equal(opportunity.nextExtraResetSequence,2);
  assert.equal(opportunity.previousExtraResetAt,at(first));
  assert.equal(result.resetForecast.followingReset.conditionalOn,at(first),'第二条分布以同一次假设为条件');
  near(opportunity.probability,renewedResetProbabilityByHours(prediction,now,at(first),opportunity.untilHours));
  assert.notEqual(opportunity.probability,resetProbabilityByHours(prediction,opportunity.untilHours),
    '不能直接使用首次分布的累计值');
});

test('兑换备用不重新开始Tibo冷却，概率以阶段已等待时间为条件',()=>{
  const p={...prediction,enforceResetCooldown:true};
  const result=plan({prediction:p,input:{...input,resetDates:['2026-10-23']},assumedResetCount:2});
  const bank=result.milestones.points.flatMap(point=>point.events).find(event=>event.kind==='backup');
  const [first]=assumedHours(result);
  assert.ok(bank&&bank.atHours<first,'备用在首次假设前使用');
  const phase=result.phasePlans.find(phase=>phase.startHours===bank.atHours),opportunity=phase.nextResetOpportunity;
  assert.equal(opportunity.previousExtraResetAt,null,'用户兑换备用不算Tibo发布reset');
  assert.equal(opportunity.nextExtraResetSequence,1);
  const before=resetProbabilityByHours(p,bank.atHours),after=resetProbabilityByHours(p,opportunity.untilHours);
  near(opportunity.probability,(after-before)/(1-before));
  assert.notEqual(opportunity.probability,renewedResetProbabilityByHours(p,now,at(bank.atHours),opportunity.untilHours),
    '不能把用户兑换备用当成Tibo再次发布reset');
});

test('普通路径以备用到期或下一补给为截止；近一小时到期不能跳过',()=>{
  const result=plan({input:{...input,resetDates:['2026-10-16']},heldResetIndices:[0]});
  const opportunity=result.phasePlans[0].nextResetOpportunity;
  assert.equal(opportunity.boundaryKind,'backup-expiry');
  assert.equal(opportunity.untilHours,15);
  near(opportunity.probability,resetProbabilityByHours(prediction,15));
  const late=planUsagePath({input:{weeklyRemaining:40,weeklyResetDays:4,weeklyResetHours:0,resetDates:['2026-10-16']},
    now:new Date('2026-10-16T23:30:00Z'),timeZone,prediction,averagePercentPerDay:20,
    heldResetIndices:[0]});
  assert.equal(late.phasePlans[0].nextResetOpportunity.untilHours,.5);
});

test('11月7日远期备用不因到期日提前兑换；作为后备时只在额度耗尽后',()=>{
  const withBank={...input,resetDates:['2026-11-07']};
  for(const count of [0,1,2]) {
    const result=plan({input:withBank,averagePercentPerDay:20,assumedResetCount:count});
    const choice=result.backupChoices[0];
    assert.equal(choice.reason,'quota-exhausted','远期到期日不能作为提前兑换理由');
    assert.equal(choice.quotaAtDecision,0);
    const banks=result.milestones.points.flatMap(point=>point.events).filter(event=>event.kind==='backup');
    assert.ok(banks.length<=1);
    for(const bank of banks)assert.ok(Math.abs(bank.overwrittenPercent)<1e-6,'远期备用只在耗尽后补上');
    const tail=result.phasePlans.filter(phase=>phase.quotaBefore>0&&!phase.plannedRest);
    assert.ok(tail.every(phase=>phase.dailyPercent===20),'不能为隐藏后备用途而强制减量');
  }
});

test('显式使用备用仍是用户约束，且不伪装成自动后备',()=>{
  const params={input:{...input,resetDates:['2026-11-07']},averagePercentPerDay:10,assumedResetCount:0};
  const kept=plan(params);
  assert.equal(kept.backupChoices[0].used,false);
  const forced=plan({...params,requiredResetIndices:[0]});
  assert.equal(forced.backupChoices[0].used,true);
  assert.equal(forced.backupChoices[0].usageCondition,undefined,'明确选择的兑换不能伪装成自动后备');
});
