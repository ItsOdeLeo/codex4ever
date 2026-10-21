import test from 'node:test';
import assert from 'node:assert/strict';
import { planUsagePath } from '../src/usage-path-planner.js';

const HOUR=3600000,now=new Date('2026-10-16T08:00:00Z'),timeZone='UTC';
const at=hours=>new Date(now.getTime()+hours*HOUR).toISOString();
const prediction={todayEndHours:16,todayProbability:.1,laterGivenNoReset:.2,next48Probability:.28,
  evidence:{dailyFrequency:.1},
  resetTimeMode:{pointAt:at(6),pointHours:6,fromHours:5.5,toHours:6.5,nearbyHours:1,probability:.04},
  followingResetEstimate:{sequence:2,conditional:true,conditionalOn:at(6),pointAt:at(42),pointHours:42,
    fromHours:41.5,toHours:42.5,nearbyHours:1,probability:.04,cumulativeProbability:.4}};
const input={weeklyRemaining:40,weeklyResetDays:4,weeklyResetHours:0,resetDates:['2026-10-16','2026-10-18']};
const plan=extra=>planUsagePath({input,now,timeZone,prediction,averagePercentPerDay:20,
  assumedResetCount:2,...extra});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const banks=result=>result.milestones.points.flatMap(point=>point.events).filter(event=>event.kind==='backup');

test('连续多张备用、不同当前用量和保留选择下，兑换不重复、不越期，覆盖旧额度只发生在到期前最后时刻',()=>{
  for(const weeklyRemaining of [10,40])for(const count of [0,1,3,8])
    for(const rate of [10,20,60,150])for(const hold of [false,true]) {
    const resetDates=Array.from({length:count},(_,index)=>`2026-10-${String(16+index*2).padStart(2,'0')}`);
    const heldResetIndices=hold ? resetDates.map((_,index)=>index).filter(index=>index%2===1) : [];
    const result=plan({input:{...input,weeklyRemaining,resetDates},averagePercentPerDay:rate,heldResetIndices});
    const used=banks(result);
    assert.equal(new Set(used.map(event=>event.resetIndex)).size,used.length);
    for(const event of used) {
      assert.ok(!heldResetIndices.includes(event.resetIndex));
      assert.ok(event.atHours<result.resets[event.resetIndex].expiresInHours);
      if(event.overwrittenPercent>1e-6)near(event.atHours,result.resets[event.resetIndex].expiresInHours-1);
      assert.equal(event.nextNormalResetAt,at(event.atHours+168));
    }
    const supplies=result.milestones.points.flatMap(point=>point.events)
      .filter(event=>['backup','normal-refresh','assumed-extra-reset'].includes(event.kind));
    const consumed=result.milestones.segments.reduce((sum,segment)=>sum+segment.usedPercent,0);
    const refilled=result.milestones.points.filter(point=>point.events.some(event=>supplies.includes(event)))
      .reduce((sum,point)=>sum+point.stateAfter.quota-point.stateBefore.quota,0);
    near(consumed,result.remainingPercent+refilled-result.milestones.points.at(-1).stateAfter.quota);
  }
});
