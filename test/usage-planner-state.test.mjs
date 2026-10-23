import test from 'node:test';
import assert from 'node:assert/strict';
import { createUsagePlannerState,updateUsagePlanner,activePlannerPrediction,usagePlannerInput } from '../src/usage-planner-state.js';

const now='2026-10-18T12:00:00Z',timeZone='Europe/Berlin',HOUR=3600000;
const at=hours=>new Date(Date.parse(now)+hours*HOUR).toISOString();
const input={weeklyRemaining:83,weeklyResetDays:6,weeklyResetHours:0,resetDates:['2026-11-07']};
const prediction={todayEndHours:10,todayProbability:.1,laterGivenNoReset:.2,next48Probability:.28,
  evidence:{dailyFrequency:.1},
  resetTimeMode:{pointAt:at(36.5),pointHours:36.5,fromHours:36,toHours:37,probability:.04},
  followingResetEstimate:{pointAt:at(84.5),pointHours:84.5,fromHours:84,toHours:85,
    probability:.04,cumulativeProbability:.4,conditionalOn:at(36.5)}};
const start=(preferences={},snapshot={})=>updateUsagePlanner(createUsagePlannerState({timeZone,...preferences}),
  {type:'new-snapshot',input,now,prediction,...snapshot});
const events=planner=>planner.result.milestones.points.flatMap(point=>point.events);
const checkAssumptions=planner=>assert.equal(planner.intent.assumedResetCount,
  events(planner).filter(event=>event.kind==='assumed-extra-reset').length);

test('同一状态驱动计算：用量目标只改目标，不能取消供给、换算法或在额度未耗尽时动用备用',()=>{
  const initial=start(),before=structuredClone(initial);
  assert.equal('mode' in initial.intent,false,'只有一种算法，没有可切换的模式');
  assert.equal(initial.intent.assumedResetCount,0,'低概率的 reset 默认不算进计划');
  const normalRefreshHours=initial.result.milestones.points.find(point=>point.events.some(event=>event.kind==='normal-refresh')).hours;
  for(const multiplier of [1,1.1,1.2,1.3,1.5,2]) {
    const current=start({targetMultiplier:multiplier});
    const {targetMultiplier,...other}=current.intent;
    const {targetMultiplier:previousTarget,...original}=initial.intent;
    assert.equal(targetMultiplier,multiplier);
    assert.deepEqual(other,original,'用量目标不改动其他状态');
    assert.equal(current.observedDailyPercent,17);
    const plannerInput=usagePlannerInput(current);
    assert.equal(plannerInput.paceMultiplier,multiplier);
    for(const key of ['optimizePolicy','adaptivePace','fixedPace','flexibleSchedule','phasePaceOverrides',
      'assumeMostLikelyReset','assumeSecondReset'])assert.equal(key in plannerInput,false,`不再传入旧参数 ${key}`);
    assert.equal(current.result.startingPoint.dailyPercent,17*targetMultiplier);
    // Keep pace holds the chosen pace, so a faster pace can run out long before the
    // normal refresh. The only bank may then bridge that outage, never earlier.
    if(targetMultiplier===1)assert.ok(!events(current).some(event=>event.kind==='backup'),'当前用量下不动用备用');
    for(const point of current.result.milestones.points.filter(point=>point.events.some(event=>event.kind==='backup'))) {
      assert.ok(Math.abs(point.stateBefore.quota)<1e-6,'备用只在额度耗尽时补上');
      assert.ok(point.events.filter(event=>event.kind==='backup').every(event=>Math.abs(event.overwrittenPercent)<1e-6));
      assert.ok(normalRefreshHours-point.hours>=24,'唯一的备用只用于到下次已知补给前至少24小时的断供');
    }
    checkAssumptions(current);
  }
  for(const action of [{type:'set-usage',step:2},{type:'set-mode',mode:'current'}])
    assert.equal(updateUsagePlanner(initial,action),initial,'旧版用量/模式动作已移除');
  assert.deepEqual(initial,before,'旧状态不可被后续动作修改');
  assert.throws(()=>{initial.intent.usageStrategy='maximize';},TypeError);
  assert.throws(()=>{initial.intent.heldResetIndices.push(0);},TypeError);
});

test('假设次数由状态统一处理：默认按置信度，手动选择不换求解器，预测开关保留选择',()=>{
  let current=start();
  const act=action=>{current=updateUsagePlanner(current,action);checkAssumptions(current);};
  assert.equal(current.intent.assumedResetCount,0);
  assert.equal(current.intent.resetCountOverride,null);
  act({type:'toggle-assumption',sequence:2});
  assert.equal(current.intent.resetCountOverride,2);
  assert.equal(current.intent.assumedResetCount,2,'无续发模型时按预测自身的间隔推出第二次');
  assert.equal(usagePlannerInput(current).assumedResetCount,2,'选择假设次数只是同一算法的输入');
  act({type:'toggle-assumption',sequence:1});
  assert.equal(current.intent.assumedResetCount,0);
  act({type:'toggle-assumption',sequence:1});
  assert.equal(current.intent.assumedResetCount,1);
  const source=activePlannerPrediction(current);
  act({type:'toggle-forecast'});
  assert.equal(activePlannerPrediction(current),null);
  assert.equal(current.intent.assumedResetCount,0);
  act({type:'toggle-forecast'});
  assert.equal(activePlannerPrediction(current),source);
  assert.equal(current.intent.assumedResetCount,1,'重新开预测保留用户选的次数');
  act({type:'new-snapshot',input,now,prediction});
  assert.equal(current.intent.resetCountOverride,null,'新数据回到按置信度自动选择');
});

test('备用约束归状态管理，调量保留约束，无效控件动作不能更改计划',()=>{
  let current=start({targetMultiplier:2},{prediction:null});
  assert.ok(events(current).some(event=>event.kind==='backup'));
  current=updateUsagePlanner(current,{type:'toggle-bank',index:0});
  assert.deepEqual(current.intent.heldResetIndices,[0]);
  assert.ok(!events(current).some(event=>event.kind==='backup'));
  current=updateUsagePlanner(current,{type:'toggle-bank',index:0});
  assert.deepEqual(current.intent.heldResetIndices,[]);
  assert.deepEqual(current.intent.requiredResetIndices,[0]);
  assert.deepEqual(usagePlannerInput(current).requiredResetIndices,[0]);
  assert.ok(events(current).some(event=>event.kind==='backup'&&event.resetIndex===0));
  for(const action of [{type:'set-usage',step:1},{type:'set-mode',mode:'current'},{type:'set-strategy',strategy:'invalid'},
    {type:'toggle-assumption',sequence:3},{type:'toggle-bank',index:8},{type:'resize',width:600}])
    assert.equal(updateUsagePlanner(current,action),current);
});

test('输入草稿与计算快照隔离；刷新满额快照沿用观测率和用量目标',()=>{
  const draft=structuredClone(input),source=structuredClone(prediction);
  let current=start({targetMultiplier:1.2}, {input:draft,prediction:source});
  draft.weeklyRemaining=2;draft.resetDates.push('2026-11-08');
  source.resetTimeMode.pointAt=at(60);
  assert.equal(current.snapshot.input.weeklyRemaining,83);
  assert.deepEqual(current.snapshot.input.resetDates,['2026-11-07']);
  assert.equal(current.snapshot.prediction.resetTimeMode.pointAt,at(36.5));
  current=updateUsagePlanner(current,{type:'invalidate'});
  assert.equal(current.result,null);
  assert.equal(current.displayEndHours,null);
  assert.equal(updateUsagePlanner(current,{type:'set-strategy',strategy:'maximize'}),current);
  current=updateUsagePlanner(current,{type:'new-snapshot',now:at(24),prediction:null,
    input:{...input,weeklyRemaining:100,weeklyResetDays:7}});
  assert.equal(current.intent.targetMultiplier,1.2);
  assert.equal(current.observedDailyPercent,17);
  assert.equal(current.result.startingPoint.dailyPercent,20.4);
  assert.ok(current.displayEndHours>0);
});

test('网页、插件页面与 MCP 共用同一个默认规则，不按入口另设',async()=>{
  const { DEFAULT_RECOMMENDATION_MODE }=await import('../src/recommended-usage-path.js');
  const { readFile }=await import('node:fs/promises');
  assert.equal(usagePlannerInput(start()).recommendationMode,DEFAULT_RECOMMENDATION_MODE);
  const page=start();
  const imported=updateUsagePlanner(createUsagePlannerState({timeZone}),{type:'import-mcp-plan',
    session:{timeZone,result:page.result,input,prediction,planning:{}}});
  assert.equal(imported.snapshot.recommendationMode,DEFAULT_RECOMMENDATION_MODE,'导入的插件计划默认同一规则');
  const server=await readFile(new URL('../src/mcp-server.js',import.meta.url),'utf8');
  assert.doesNotMatch(server,/recommendationMode\s*[:=]\s*'(feedback|forecast-preview)'/,'MCP 不能写死另一套默认');
  const skill=await readFile(new URL('../plugins/usage-planner/skills/codex-usage/SKILL.md',import.meta.url),'utf8');
  assert.doesNotMatch(skill,/recommendationMode:"feedback"/,'Skill 不能要求插件改用另一套规则');
});

test('导入插件计划时，正常刷新取账户自己的时间，而不是计划里假设 reset 之后的刷新',()=>{
  const now='2026-10-21T09:15:00.000Z',resetAt='2026-10-27T07:30:00.000Z';
  const imported=updateUsagePlanner(createUsagePlannerState({timeZone}),{type:'import-mcp-plan',session:{timeZone,
    usageSnapshot:{weekly:{remainingPercent:73,resetAt}},planning:{},prediction:null,
    result:{available:false,now,normalResetInHours:417,resets:[]}}});
  const hours=(Date.parse(resetAt)-Date.parse(now))/3600000;
  assert.equal(imported.snapshot.input.weeklyResetDays,Math.floor(hours/24));
  assert.equal(imported.snapshot.input.weeklyResetHours,Math.floor(hours%24));
  assert.ok(imported.snapshot.input.weeklyResetDays<=7,'每周窗口最多 7 天');
});

