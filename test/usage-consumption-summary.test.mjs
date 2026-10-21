import test from 'node:test';
import assert from 'node:assert/strict';
import { usageConsumptionSummary } from '../src/usage-consumption-summary.js';
import { usageRateDetail } from '../src/usage-rate-label.js';
import { planUsagePath } from '../src/usage-path-planner.js';

const now=new Date('2026-10-16T08:00:00Z');
const input={weeklyRemaining:40,weeklyResetDays:4,weeklyResetHours:0,resetDates:[]};
const plan=extra=>planUsagePath({input,now,timeZone:'UTC',...extra});

test('用余额和原正常刷新时间计算当前日均，清楚展示已用额度和已过时间',()=>{
  const result=usageConsumptionSummary(plan());
  assert.equal(result.dailyPercent,20);
  assert.equal(result.remainingPercent,40);
  assert.equal(result.elapsedHours,72);
  assert.equal(result.refreshLabel,'4天 0小时');
  assert.equal(result.calculationLabel,'60% ÷ 72小时 × 24');
  assert.equal(result.source,'weekly-window-average');
  const short=usageConsumptionSummary(plan({input:{...input,weeklyResetDays:6,weeklyResetHours:10}}));
  assert.equal(short.elapsedHours,14);
  assert.ok(Math.abs(short.dailyPercent-60*24/14)<1e-10);
});

test('备用推迟正常刷新及手动加量不篡改观测均值；100%时沿用观测不伪造公式',()=>{
  const bank=plan({input:{...input,resetDates:['2026-10-17']},requiredResetIndices:[0],paceMultiplier:1.2});
  assert.notEqual(bank.normalResetAt,bank.originalNormalResetAt);
  const summary=usageConsumptionSummary(bank);
  assert.equal(summary.refreshHours,96);
  assert.equal(summary.dailyPercent,20);
  const full=usageConsumptionSummary(plan({input:{...input,weeklyRemaining:100},averagePercentPerDay:30}));
  assert.equal(full.dailyPercent,30);
  assert.equal(full.source,'previous-observation');
  assert.doesNotMatch(full.calculationLabel,/÷/);
});

test('每段日均明确显示起点和目标值，保持当前不重复基数',()=>{
  assert.equal(usageRateDetail(20,10),'10% / 天');
  assert.equal(usageRateDetail(20,24),'24% / 天');
  assert.equal(usageRateDetail(20,20),'20% / 天');
});
