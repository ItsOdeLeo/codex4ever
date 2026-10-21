import test from 'node:test';
import assert from 'node:assert/strict';
import { planUsagePath } from '../src/usage-path-planner.js';
import { alertBaseline,checkUsageAgainstPlan,plannedRemainingAt,usageAlertRule } from '../src/usage-alert.js';

const HOUR=3600000,now=new Date('2026-10-20T12:00:00Z');
const at=hours=>new Date(now.getTime()+hours*HOUR).toISOString();
// Keep pace at 20%/day with 40% left: the plan runs out after 48 hours.
const result=planUsagePath({input:{weeklyRemaining:40,weeklyResetDays:4,weeklyResetHours:0,resetDates:[]},
  now,timeZone:'UTC',averagePercentPerDay:20});
const baseline=alertBaseline(result);
const snapshot=(hours,remainingPercent,resetAt=baseline.normalResetAt)=>({readAt:at(hours),weekly:{remainingPercent,resetAt}});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);

test('基线记录首个补给前的计划余量，可安全存成 JSON',()=>{
  assert.equal(baseline.remainingPercent,40);
  near(plannedRemainingAt(baseline,at(6)),35);
  near(Date.parse(baseline.plannedDepletionAt),Date.parse(at(48)));
  assert.deepEqual(JSON.parse(JSON.stringify(baseline)),baseline);
});

test('按计划用：不提醒',()=>{
  const check=checkUsageAgainstPlan({baseline,snapshot:snapshot(6,35)});
  assert.equal(check.status,'on-track');
  assert.equal(check.message,null);
});

test('比计划多用 5% 以上：提醒，给出多用多少、何时用完和建议用量',()=>{
  const check=checkUsageAgainstPlan({baseline,snapshot:snapshot(6,28),suggestedDailyPercent:14,timeZone:'UTC'});
  assert.equal(check.status,'over-plan');
  near(check.overPercent,7);
  near(Date.parse(check.projectedDepletionAt),Date.parse(at(6+28/48*24)));
  assert.ok(check.earlierHours>0);
  assert.match(check.message,/比计划多用了 7%（计划剩 35%，实际剩 28%）/);
  assert.match(check.message,/建议把用量降到每天 14%/);
  const english=checkUsageAgainstPlan({baseline,snapshot:snapshot(6,28),language:'en',timeZone:'UTC'});
  assert.match(english.message,/7% over plan/);
});

test('多用不到 5%，但按现速会提前 20% 以上用完：也提醒',()=>{
  const check=checkUsageAgainstPlan({baseline,snapshot:snapshot(6,33.5)});
  assert.ok(check.overPercent<usageAlertRule.overPlanPercent);
  assert.equal(check.status,'over-plan');
  assert.ok(check.earlierHours>48*usageAlertRule.earlierFraction-1e-6);
});

test('中间发生补满（刷新时间改变或额度上升）：不提醒，提示重新规划',()=>{
  assert.equal(checkUsageAgainstPlan({baseline,snapshot:snapshot(6,100,at(6+168))}).status,'refilled');
  assert.equal(checkUsageAgainstPlan({baseline,snapshot:snapshot(6,60)}).status,'refilled');
  assert.equal(checkUsageAgainstPlan({baseline,snapshot:snapshot(400,10)}).status,'stale');
  assert.equal(checkUsageAgainstPlan({baseline:null,snapshot:snapshot(6,35)}).status,'no-plan');
});
