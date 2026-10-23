import test from 'node:test';
import assert from 'node:assert/strict';
import { planUsagePath } from '../src/usage-path-planner.js';
import { layoutStrategyTree,renderStrategyTree } from '../src/strategy-tree-layout.js';

const now=new Date('2026-10-18T12:00:00Z'),timeZone='Europe/Berlin',HOUR=3600000;
const input={weeklyRemaining:40,weeklyResetDays:4,weeklyResetHours:0,resetDates:['2027-05-01']};
const plan=extra=>planUsagePath({input,now,timeZone,averagePercentPerDay:5,
  ...extra});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);

test('远期备用本轮不需要时只保留库存，不在正常刷新处伪造兑换操作或延长日期轴',()=>{
  for(const heldResetIndices of [[],[0]]) {
    const options={heldResetIndices};
    const result=plan(options),choice=result.backupChoices[0];
    const empty=plan({...options,heldResetIndices:[],input:{...input,resetDates:[]}});
    assert.equal(choice.used,false);
    assert.equal(choice.actionable,false);
    assert.equal(choice.atHours,null);
    assert.equal(choice.at,null);
    assert.equal(choice.reason,'not-needed-before-refresh');
    assert.equal(result.normalResetAt,empty.normalResetAt);
    const graph=layoutStrategyTree(result),other=layoutStrategyTree(empty);
    assert.deepEqual(graph.dayAxis.days,other.dayAxis.days);
    assert.equal(graph.bankedCount,1);
    assert.equal(graph.nodes.filter(node=>node.resetIndex===0).length,0);
    const html=renderStrategyTree(graph,String);
    assert.match(html,/data-banked-count="1"/);
    assert.doesNotMatch(html,/本轮保留|2027-05-01|保留备用 reset/);
    assert.doesNotMatch(html,/data-backup-choice|点击使用/);
    assert.equal(graph.nodes.filter(node=>node.id==='normal-reset').length,1);
  }
});

test('多张远期库存不额外增加七天；未用临期备用也不伪造日期操作',()=>{
  const empty=layoutStrategyTree(plan({input:{...input,resetDates:[]}}));
  const distant=plan({input:{...input,resetDates:['2027-04-01','2027-05-01','2027-06-01']}});
  assert.deepEqual(layoutStrategyTree(distant).dayAxis.days,empty.dayAxis.days);
  assert.equal(distant.backupChoices.filter(c=>!c.actionable).length,3);
  const expiring=plan({input:{...input,resetDates:['2026-10-19']},heldResetIndices:[0]});
  const choice=expiring.backupChoices[0];
  assert.equal(choice.actionable,true);
  assert.equal(choice.reason,'expiry-deadline');
  assert.equal(choice.expiresBeforeDepletion,true);
  near(choice.atHours,expiring.resets[0].expiresInHours-1);
  const html=renderStrategyTree(layoutStrategyTree(expiring),String);
  assert.doesNotMatch(html,/data-backup-choice="0"|data-node-id="held:|data-node-id="expiry:/);
  assert.match(html,/data-banked-count="1"/);
});

test('耗尽时只显示确实建议使用的备用；保留分支没有日期节点',()=>{
  const held=plan({averagePercentPerDay:20,heldResetIndices:[0]});
  near(held.backupChoices[0].atHours,48);
  assert.equal(held.backupChoices[0].actionable,true);
  assert.equal(held.backupChoices[0].quotaAtDecision,0);
  assert.ok(!layoutStrategyTree(held).nodes.some(node=>node.resetIndex===0));
  // The one algorithm keeps a distant bank in reserve through a short gap;
  // an explicit use is placed at the same depletion point.
  const reserved=plan({averagePercentPerDay:20});
  assert.equal(reserved.backupChoices[0].used,false);
  near(reserved.backupChoices[0].atHours,48);
  assert.ok(!layoutStrategyTree(reserved).nodes.some(node=>node.resetIndex===0));
  const used=plan({averagePercentPerDay:20,requiredResetIndices:[0]});
  assert.equal(used.backupChoices[0].used,true);
  near(used.backupChoices[0].atHours,48);
  near(layoutStrategyTree(used).nodes.find(node=>node.id==='backup:0').atHours,48);
  const baseline=layoutStrategyTree(held).dayAxis;
  for(const requiredResetIndices of [[],[0]]) {
    const alternative=plan({averagePercentPerDay:20,requiredResetIndices});
    assert.deepEqual(layoutStrategyTree(alternative).dayAxis.days,baseline.days,
      '真正需要的远期备用切换使用或保留，仍共用固定日期范围');
  }
  const simultaneous=plan({averagePercentPerDay:10,heldResetIndices:[0]});
  assert.equal(simultaneous.backupChoices[0].actionable,false);
  assert.equal(simultaneous.backupChoices[0].atHours,null);
});

test('第一次与二次假设的补满点不能再次提示兑换远期备用，后续未耗尽时继续保留',()=>{
  const at=hours=>new Date(now.getTime()+hours*HOUR).toISOString();
  const prediction={todayEndHours:10,todayProbability:.1,laterGivenNoReset:.2,next48Probability:.28,
    evidence:{dailyFrequency:.1},resetTimeMode:{pointAt:at(24),pointHours:24,fromHours:23.5,toHours:24.5,probability:.03},
    followingResetEstimate:{pointAt:at(72),pointHours:72,fromHours:71.5,toHours:72.5,probability:.03,
      conditionalOn:at(24),cumulativeProbability:.4}};
  for(const assumeSecondReset of [false,true]) {
    const result=plan({prediction,assumedResetCount:assumeSecondReset ? 2 : 1,heldResetIndices:[0]});
    assert.equal(result.backupChoices[0].actionable,false);
    assert.equal(result.backupChoices[0].at,null);
    const graph=layoutStrategyTree(result,{prediction});
    assert.equal(graph.bankedCount,1);
    assert.equal(graph.nodes.filter(node=>node.resetIndex===0).length,0);
    assert.equal(graph.funnel.refills.filter(refill=>refill.kind==='assumed-extra').length,assumeSecondReset ? 2 : 1);
  }
});

test('库中显式强制使用仍尊重调用方约束并容纳实际后继刷新',()=>{
  const required=plan({requiredResetIndices:[0]});
  assert.equal(required.backupChoices[0].used,true);
  assert.ok(layoutStrategyTree(required).dayAxis.endHours>=required.milestones.points.at(-1).hours);
});
