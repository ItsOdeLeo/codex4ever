import test from 'node:test';
import assert from 'node:assert/strict';
import { planUsagePath } from '../src/usage-path-planner.js';
import { usageStrategyCalendar } from '../src/usage-strategy.js';
import { createUsagePlannerState,updateUsagePlanner } from '../src/usage-planner-state.js';
import { layoutStrategyTree,renderStrategyTree } from '../src/strategy-tree-layout.js';

const HOUR=3600000,now=new Date('2026-10-16T12:00:00Z'),timeZone='UTC';
const at=hours=>new Date(+now+hours*HOUR).toISOString();
const input={weeklyRemaining:80,weeklyResetDays:6,weeklyResetHours:0,resetDates:['2026-11-07']};
const prediction={todayEndHours:12,todayProbability:.1,laterGivenNoReset:.4,next48Probability:.46,
  evidence:{dailyFrequency:.2,intervalModel:{meanIntervalDays:3}},
  resetTimeMode:{pointAt:at(72),pointHours:72},followingResetEstimate:{pointAt:at(144),pointHours:144,
    cumulativeProbability:.4,conditionalOn:at(72)}};
const plan=(usageStrategy,extra={})=>planUsagePath({input,now,timeZone,averagePercentPerDay:5,
  prediction,usageStrategy,...extra});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);
// The first cycle ends at the first assumed (conservatively timed) reset.
const firstAssumed=trace=>trace.events.find(event=>event.kind==='assumed-extra-reset').atHours;
const firstCycleWork=(trace,weekend)=>{
  const end=firstAssumed(trace);
  const calendar=usageStrategyCalendar({now:now.toISOString(),timeZone,horizonHours:Math.ceil(end)});
  return trace.segments.reduce((sum,segment)=>sum+calendar.slots.filter(slot=>slot.weekend===weekend)
    .reduce((total,slot)=>total+Math.max(0,Math.min(end,segment.endHours,slot.endHours)
      -Math.max(segment.startHours,slot.startHours))*segment.dailyPercent/24,0),0);
};

test('同样额度和预测，三种策略真正改变日历用量；重置前用满且保留远期备用',()=>{
  const kept=plan('balanced');
  assert.ok(kept.recommendation.primary.trace.events.find(event=>event.kind==='assumed-extra-reset').overwrittenPercent>0);
  const outcomes={};
  for(const strategy of ['maximize','weekdays','weekend-focus']) {
    const result=plan(strategy),trace=result.recommendation.primary.trace;
    outcomes[strategy]=trace;
    assert.equal(result.usageStrategy,strategy);
    assert.ok(result.backupChoices.every(choice=>!choice.used),'够用时不得消耗11月7日备用');
    assert.equal(trace.events.filter(event=>event.kind==='assumed-extra-reset').length,2);
    const calendar=usageStrategyCalendar({now:now.toISOString(),timeZone,horizonHours:504});
    let cycleStart=0;
    for(const event of trace.events.filter(event=>event.kind!=='expiry')) {
      // Weekends only is strict: a refill cycle without a weekend is left
      // unused, so only that cycle's refill may overwrite quota.
      const weekendInCycle=calendar.slots.some(slot=>slot.weekend&&slot.endHours>cycleStart&&slot.startHours<event.atHours);
      if(strategy!=='weekend-focus'||weekendInCycle)near(event.overwrittenPercent,0);
      near((Date.parse(event.nextNormalResetAt)-Date.parse(event.at))/HOUR,168);
      cycleStart=event.atHours;
    }
    if(strategy==='weekend-focus')for(const segment of trace.segments)
      for(const slot of calendar.slots.filter(slot=>!slot.weekend))
        if(Math.min(segment.endHours,slot.endHours)>Math.max(segment.startHours,slot.startHours)+1e-6)
          near(segment.dailyPercent,0);
    for(const segment of trace.segments) {
      near(segment.remainingBefore-segment.remainingAfter,
        segment.dailyPercent*(segment.endHours-segment.startHours)/24);
      assert.ok(segment.remainingAfter>=0);
    }
    near(80+trace.events.filter(event=>event.kind!=='expiry').reduce((sum,event)=>sum+100-event.overwrittenPercent,0)-trace.work,trace.remainingQuota);
    for(const locale of ['en','zh-CN'])for(const viewportWidth of [380,1400]) {
      const graph=layoutStrategyTree(result,{prediction,viewportWidth,locale});
      const html=renderStrategyTree(graph,String);
      assert.doesNotMatch(html,/NaN|undefined|data-node-id="backup:0"/);
      for(const band of graph.funnel.bands)if(!['refresh','assumed-refresh'].includes(band.kind)
        &&band.startQuota>0&&band.startQuota===band.endQuota)
        assert.equal(band.kind,'rest','休息段用虚线表示，计算中的剩余额度仍保持不变');
    }
  }
  near(outcomes.maximize.segments[0].dailyPercent,80*24/firstAssumed(outcomes.maximize));
  near(firstCycleWork(outcomes.weekdays,true),0);
  near(firstCycleWork(outcomes.weekdays,false),80);
  near(firstCycleWork(outcomes['weekend-focus'],true),80);
  near(firstCycleWork(outcomes['weekend-focus'],false),0);
  assert.equal(outcomes['weekend-focus'].pauseHours,0,'主动休息不能算成断供');
  assert.ok(outcomes['weekend-focus'].restHours>0);
});

test('截图回归：周日休息的0%不挤住75.2%；两种日历策略休息只画虚线，同速工作段只标一次',()=>{
  const origin=new Date('2026-10-18T12:00:00Z');
  const at=hours=>new Date(+origin+hours*HOUR).toISOString();
  const forecast={...prediction,todayEndHours:10,
    resetTimeMode:{pointAt:at(36.5),pointHours:36.5},
    followingResetEstimate:{pointAt:at(84.5),pointHours:84.5,cumulativeProbability:.4,conditionalOn:at(36.5)}};
  let sawRepeated=false;
  for(const usageStrategy of ['weekdays','weekend-focus']) {
    const selectedForecast=usageStrategy==='weekend-focus' ? {...forecast,
      followingResetEstimate:{...forecast.followingResetEstimate,pointAt:at(168),pointHours:168}} : forecast;
    const result=planUsagePath({input:{...input,weeklyRemaining:83},now:origin,timeZone:'Europe/Berlin',
      prediction:selectedForecast,averagePercentPerDay:17,usageStrategy});
    const original=structuredClone(result),rest=result.phasePlans.filter(phase=>phase.plannedRest);
    assert.ok(rest.length);
    for(const locale of ['en','zh-CN'])for(const viewportWidth of [380,900,1400]) {
      const graph=layoutStrategyTree(result,{prediction:selectedForecast,locale,viewportWidth});
      const html=renderStrategyTree(graph,String);
      assert.ok(graph.phaseControls.every(phase=>!phase.plannedRest));
      for(const phase of rest)assert.ok(!html.includes(`data-phase-start-at="${phase.startAt}"`),
        '休息段不显示用量、概率或截止日期');
      const dashed=[...html.matchAll(/<g class="quota-phase" data-quota-rest[^>]*>([\s\S]*?)<\/g>/g)];
      assert.ok(dashed.length);
      for(const [,content] of dashed) {
        assert.match(content,/quota-rest-line/);
        assert.doesNotMatch(content,/quota-band|<text|<circle/,'休息段只有虚线，没有实心额度或数字');
      }
      for(const band of graph.funnel.bands.filter(band=>band.kind==='rest')) {
        near(band.startQuota,band.endQuota);
        assert.deepEqual(band.labels,[]);
      }
      const work=result.phasePlans.filter(phase=>!phase.plannedRest);
      const repeated=work.find(phase=>work.filter(other=>other.resourceCycle===phase.resourceCycle
        &&Math.abs(other.dailyPercent-phase.dailyPercent)<1e-5).length>1);
      if(repeated) {
        sawRepeated=true;
        assert.equal(graph.phaseControls.filter(phase=>phase.resourceCycle===repeated.resourceCycle
          &&Math.abs(phase.dailyPercent-repeated.dailyPercent)<1e-5).length,1);
      }
      if(usageStrategy==='weekdays') {
        // Monday 00:00 Berlin until the first assumed reset, all weekday hours.
        const firstAssumed=(Date.parse(result.recommendation.primary.assumedResetTimes[0])-Date.parse('2026-10-18T22:00:00.000Z'))/HOUR;
        assert.equal(graph.phaseControls[0].startAt,'2026-10-18T22:00:00.000Z');
        near(graph.phaseControls[0].dailyPercent,83*24/firstAssumed);
      }
    }
    assert.deepEqual(result,original,'省略显示不能改变用量、剩余额度、重置时间或概率');
  }
  assert.ok(sawRepeated,'样例包含被休息隔开的同速工作段');
});

test('关闭预测仅按正常刷新规划；能力上限与没有可用工作日都不能伪造用完',()=>{
  for(const strategy of ['maximize','weekdays','weekend-focus']) {
    const result=plan(strategy,{prediction:null});
    assert.equal(result.recommendation.primary,null);
    assert.ok(!result.milestones.points.some(point=>point.events.some(event=>event.kind==='assumed-extra-reset')));
    const refresh=result.recommendation.fallback.events.find(event=>event.kind==='normal-refresh');
    near(refresh.atHours,144);near(refresh.overwrittenPercent,0);
  }
  const capped=plan('maximize',{dailyCapacityPercent:10});
  assert.ok(capped.recommendation.primary.trace.segments.every(segment=>segment.dailyPercent<=10));
  const cappedReset=capped.recommendation.primary.trace.events.find(event=>event.kind==='assumed-extra-reset');
  near(cappedReset.overwrittenPercent,80-cappedReset.atHours*10/24);
  const weekend=plan('weekdays',{now:new Date('2026-10-17T00:00:00Z'),prediction:null,
    input:{...input,weeklyResetDays:1,weeklyResetHours:0,resetDates:[]}});
  const trace=weekend.recommendation.fallback;
  assert.equal(trace.work,0);assert.equal(trace.pauseHours,0);near(trace.restHours,24);
  near(trace.events.find(event=>event.kind==='normal-refresh').overwrittenPercent,80);
});

test('预测落空沿用同一个首段动作，只有发生的重置才补额度；显式取消不会被策略日历恢复',()=>{
  const result=plan('maximize'),{trace,fallback}=result.recommendation.primary;
  assert.equal(fallback.publicCount,0);
  near(fallback.segments[0].dailyPercent,trace.segments[0].dailyPercent);
  assert.ok(fallback.segments.some(segment=>segment.kind==='pause'));
  assert.ok(!fallback.events.some(event=>event.kind==='backup'),'风险场景也不能擅自花掉保留的备用');
  const canceled=plan('weekdays',{assumedResetCount:0});
  assert.equal(canceled.recommendation.primary,null);
  assert.ok(!canceled.milestones.points.some(point=>point.events.some(event=>event.kind==='assumed-extra-reset')));
  const one=plan('weekend-focus',{assumedResetCount:1});
  assert.equal(one.forecastScenario.selected,true);assert.equal(one.forecastScenario.secondSelected,false);
});

test('日历按用户时区识别周末和夏令时：周日是23或25小时，额度仍守恒',()=>{
  for(const [stamp,hours] of [['2026-03-28T23:00:00Z',23],['2026-10-24T22:00:00Z',25]]) {
    const calendar=usageStrategyCalendar({now:stamp,timeZone:'Europe/Berlin',horizonHours:72});
    assert.equal(calendar.slots[0].weekend,true);
    near(calendar.slots[0].endHours,hours);
    const weekends=calendar.allocate({strategy:'weekend-focus',start:0,end:48,quota:100});
    near(weekends.dailyPercent,100*24/hours);
    near(calendar.allocate({strategy:'weekdays',start:0,end:48,quota:100}).dailyPercent,0);
  }
  const east=usageStrategyCalendar({now:'2026-10-16T18:00:00Z',timeZone:'Asia/Tokyo',horizonHours:24});
  const west=usageStrategyCalendar({now:'2026-10-16T18:00:00Z',timeZone:'America/Los_Angeles',horizonHours:24});
  assert.equal(east.slots[0].weekend,true);assert.equal(west.slots[0].weekend,false);
});

test('策略选择属于统一状态，保留快照、预测、备用约束及同一日期轴',()=>{
  let current=updateUsagePlanner(createUsagePlannerState({timeZone}),
    {type:'new-snapshot',input,now,prediction});
  const initial=current;
  for(const strategy of ['maximize','weekdays','weekend-focus','balanced']) {
    current=updateUsagePlanner(current,{type:'set-strategy',strategy});
    assert.equal(current.intent.usageStrategy,strategy);
    assert.equal(current.snapshot,initial.snapshot);
    assert.equal(current.displayEndHours,initial.displayEndHours);
    assert.equal(current.intent.assumedResetCount,2);
    assert.deepEqual(current.intent.heldResetIndices,[]);
    layoutStrategyTree(current.result,{prediction,displayEndHours:current.displayEndHours,viewportWidth:1000});
  }
  assert.equal(initial.intent.usageStrategy,'balanced');
  assert.equal(updateUsagePlanner(current,{type:'set-strategy',strategy:'bad'}),current);
});
