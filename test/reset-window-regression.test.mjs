import test from 'node:test';
import assert from 'node:assert/strict';
import { planUsagePath } from '../src/usage-path-planner.js';
import { layoutStrategyTree } from '../src/strategy-tree-layout.js';

const HOUR=3600000,WEEK=168,now=new Date('2026-10-16T08:00:00Z'),timeZone='UTC';
const at=hours=>new Date(now.getTime()+hours*HOUR).toISOString();
const predictionAt=(hours,second)=>({todayEndHours:16,todayProbability:.1,laterGivenNoReset:.2,
  next48Probability:.28,evidence:{dailyFrequency:.1},
  resetTimeMode:{pointAt:at(hours),pointHours:hours,fromHours:hours-.5,toHours:hours+.5,nearbyHours:1,probability:.04},
  ...(second ? {followingResetEstimate:{sequence:2,conditional:true,conditionalOn:at(hours),
    pointAt:at(second),pointHours:second,fromHours:second-.5,toHours:second+.5,
    nearbyHours:1,probability:.04,cumulativeProbability:.4}} : {})});
const input={weeklyRemaining:40,weeklyResetDays:4,weeklyResetHours:0,resetDates:[]};
const plan=extra=>planUsagePath({input,now,timeZone,averagePercentPerDay:60,prediction:predictionAt(6),
  assumedResetCount:1,...extra});
const supplies=result=>result.milestones.points.flatMap(point=>point.events)
  .filter(event=>['normal-refresh','backup','assumed-extra-reset'].includes(event.kind));
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const assumedHours=result=>result.recommendation.primary.assumedResetTimes.map(time=>(Date.parse(time)-now.getTime())/HOUR);

function assertWeeklyWindow(result) {
  const events=supplies(result);
  for(const event of events)assert.equal(Date.parse(event.nextNormalResetAt)-Date.parse(event.at),WEEK*HOUR);
  const previous=events.at(-2),terminal=events.at(-1);
  assert.equal(terminal.kind,'normal-refresh');
  near(terminal.atHours,previous.atHours+WEEK);
  assert.equal(result.normalResetAt,terminal.at);
}

test('额外reset替换原正常刷新日期，按本次reset后七天计算',()=>{
  const result=plan();
  assertWeeklyWindow(result);
  const [first]=assumedHours(result);
  near(result.normalResetInHours,first+WEEK);
  assert.equal(result.normalResetSource,'estimated-restarted-week');
  assert.equal(result.originalNormalResetAt,at(96));
  assert.ok(!supplies(result).some(event=>event.kind==='normal-refresh'&&event.atHours===96));
  assert.deepEqual(supplies(result).map(event=>event.kind),['assumed-extra-reset','normal-refresh']);
});

test('连续两次额外reset以后只保留第二次后七天，两个旧日期都失效',()=>{
  const prediction=predictionAt(6,42),result=plan({prediction,assumedResetCount:2});
  assertWeeklyWindow(result);
  const [first,second]=assumedHours(result);
  near(result.normalResetInHours,second+WEEK);
  assert.deepEqual(supplies(result).map(event=>[event.kind,event.atHours]),
    [['assumed-extra-reset',first],['assumed-extra-reset',second],['normal-refresh',second+WEEK]]);
  const horizontal=layoutStrategyTree(result,{prediction});
  const normal=horizontal.nodes.find(node=>node.id==='normal-reset');
  near(normal.atHours,second+WEEK);
});

test('每次补给都重开七天，后来的额外reset再次覆盖正常刷新日程',()=>{
  const result=plan({input:{...input,weeklyResetDays:0,weeklyResetHours:6},prediction:predictionAt(200)});
  assertWeeklyWindow(result);
  const [first]=assumedHours(result);
  assert.deepEqual(supplies(result).map(event=>[event.kind,event.atHours]),
    [['assumed-extra-reset',first],['normal-refresh',first+WEEK]]);
});

test('备用、额外reset、再次备用按发生顺序逐次覆盖正常刷新时间',()=>{
  const result=plan({input:{...input,resetDates:['2026-10-16','2026-10-20']},prediction:predictionAt(42)});
  assertWeeklyWindow(result);
  const kinds=supplies(result).map(event=>event.kind);
  assert.deepEqual(kinds,['backup','assumed-extra-reset','backup','normal-refresh']);
  const [first]=assumedHours(result);
  for(const phase of result.phasePlans.filter(phase=>phase.startHours>=first&&!phase.plannedRest&&phase.quotaBefore>0))
    near(phase.dailyPercent,60);
});

test('未计入额外reset时，不提前移动实际正常刷新时间',()=>{
  const result=plan({assumedResetCount:0});
  assert.equal(result.normalResetAt,at(96));
  assert.equal(result.normalResetSource,'entered-account-time');
  assert.ok(!supplies(result).some(event=>event.kind==='assumed-extra-reset'));
});
