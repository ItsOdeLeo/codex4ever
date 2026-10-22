import { resetProbabilityByHours } from './local-predictor.js';
import { renewedResetProbabilityByHours } from './reset-sequence-forecast.js';
import { usageStrategyCalendar,validUsageStrategy } from './usage-strategy.js';
import { availabilityPace,availabilityDefaults,assessAvailability,validAvailabilityMode } from './availability-goal.js';

const HOUR=3600000, WEEK=168, EPS=1e-7;
const OUTAGE_DAY_COST=2;
const clamp=value=>Math.max(0,Math.min(1,value));

// Product trade-offs, in days of work at the requested daily usage. These
// are explicit preferences, not fitted forecast parameters or confidence.
//  interruptionPerDay 2      a day without quota costs twice a day of work:
//                            stopping hurts more than working slower
//  nearTerm* 48h, +2         an outage in the next two days costs double again;
//                            it is certain to be felt and the forecast is freshest
//  paceDeviationPerDay .35   squared penalty for "keep available" working
//                            away from the requested pace
//  futureResourceValue .65   quota or banks left at the end are worth 65% of
//                            work now: still useful, but uncertain and expiring
//  overwriteCost .05         small tie-breaker against refills that discard quota
//  bankOptionLossCost 2      a redeemed bank overwritten while it would still
//                            have been valid wasted a scarce option
//  bankScarcityCost .65      spending one of few banks costs more than one of many
//  horizonHours 336          two weeks scored, then followed to the next refill
// The newer one-solver page path uses only this objective; the older
// intensity optimizer keeps its own (continuity-first) objective.
export const resetPolicyObjective=Object.freeze({
  interruptionPerDay:OUTAGE_DAY_COST, paceDeviationPerDay:.35, futureResourceValue:.65,
  overwriteCost:.05, bankOptionLossCost:OUTAGE_DAY_COST,bankScarcityCost:.65,
  nearTermHours:48,nearTermInterruptionPerDay:OUTAGE_DAY_COST,horizonHours:336
});

// Which predicted resets the main plan counts on, and when. A reset counts
// only if it is likely before the refresh in effect; it is then placed where
// it has most probably already happened, not at its single most likely hour.
export const resetAssumptionRule=Object.freeze({countProbability:.6,timingQuantile:.75,maximumCount:2});
// The last live bank is a fallback: spend it only on a real outage.
export const LAST_BANK_MINIMUM_OUTAGE_HOURS=24;
const MAXIMUM_SCHEDULED_DAILY_PERCENT=100;
// A bank may wait for the next likely reset, but never longer than two days.
export const FORECAST_BANK_WAIT_CAP_HOURS=48;

/** Assumed reset hours for the main plan. `count` is 'auto' (apply the
 * probability threshold) or a user-chosen 0–2, which skips the threshold but
 * keeps the conservative timing. Each later reset is conditional on the
 * earlier assumed one and restarts the seven-day window there.
 */
export function confidentResetTimes({prediction,now,normalHours,horizonHours=336,count='auto'}) {
  const origin=Date.parse(now),times=[],probabilities=[];
  if(!prediction||!Number.isFinite(origin)||count===0)return {times,probabilities};
  const limit=count==='auto' ? resetAssumptionRule.maximumCount : count;
  let previous=null,windowEnd=normalHours;
  while(times.length<limit) {
    const raw=hours=>previous===null ? resetProbabilityByHours(prediction,hours)
      : renewedResetProbabilityByHours(prediction,now,new Date(origin+previous*HOUR).toISOString(),hours);
    const cdf=hours=>raw(hours)??0;
    const end=Math.floor(Math.min(windowEnd,horizonHours));
    if(previous!==null&&raw(end)===null) {
      // No renewal model: keep the forecast's own gap between its first and
      // following estimates, measured from the first reset as assumed here.
      const following=prediction.followingResetEstimate;
      const gap=(Date.parse(following?.pointAt)-Date.parse(following?.conditionalOn??prediction.resetTimeMode?.pointAt))/HOUR;
      const hour=previous+gap;
      const probability=following?.cumulativeProbability??null;
      if(Number.isFinite(hour)&&hour>previous+EPS&&hour<=end
        &&(count!=='auto'||probability>=resetAssumptionRule.countProbability)) {times.push(hour);probabilities.push(probability);}
      break;
    }
    const probability=clamp(cdf(end));
    if(probability<=EPS||count==='auto'&&probability<resetAssumptionRule.countProbability)break;
    let at=null;
    for(let hour=Math.floor(previous??0)+1;hour<=end;hour++)
      if(cdf(hour)>=resetAssumptionRule.timingQuantile*probability-EPS){at=hour;break;}
    if(at===null)break;
    times.push(at);probabilities.push(probability);
    previous=at;windowEnd=at+WEEK;
  }
  return {times,probabilities};
}

/** A common set of possible public-reset histories for all candidate policies.
 * Invert the first-event CDF, then renew after each *sampled public event*.
 * Bank redemption never changes these histories. Unresolved tail mass remains
 * a no-event outcome; forecasts are never promoted to guaranteed resources.
 */
export function publicResetScenarios({prediction,now,horizonHours=336,sampleCount=64}) {
  const origin=Date.parse(now),tables=new Map();
  if(!Number.isFinite(origin)||!Number.isInteger(horizonHours)||horizonHours<1||horizonHours>336
    ||!Number.isInteger(sampleCount)||sampleCount<1||sampleCount>256||(sampleCount&(sampleCount-1)))
    throw new Error('Scenario sampling needs a valid time, 1–336 hours, and a power-of-two sample count up to 256');
  const table=previous=>{
    const key=previous??'first';
    if(tables.has(key))return tables.get(key);
    const cdf=hours=>prediction ? previous===null
      ? resetProbabilityByHours(prediction,hours)
      : renewedResetProbabilityByHours(prediction,now,new Date(origin+previous*HOUR).toISOString(),hours) : 0;
    // Hourly event grid. Consumption/depletion is still continuous and exact.
    const values=[];
    for(let h=0;h<=horizonHours;h++) {
      const value=cdf(h);
      values.push(Number.isFinite(value) ? clamp(value) : values.at(-1)??0);
    }
    tables.set(key,values);
    return values;
  };
  const invert=(values,u,after=0)=>{
    for(let h=Math.floor(after)+1;h<values.length;h++)if(values[h]>=u&&values[h]>values[h-1]+EPS)
      return Math.max(after+EPS,h-1+(u-values[h-1])/(values[h]-values[h-1]));
    return null;
  };
  const paths=[];
  for(let index=0;index<(prediction ? sampleCount : 1);index++) {
    const events=[];
    let previous=null,weight=1/(prediction ? sampleCount : 1);
    // A deterministic stratified lattice: reproducible, with the same paths
    // for every candidate. No sampling-error confidence interval is claimed.
    for(let sequence=0;sequence<horizonHours;sequence++) {
      const values=table(previous),mass=values.at(-1);
      // Preserve the no-further-event tail as an explicit weighted branch,
      // even when it is smaller than one sample. Do not renormalize it away.
      if(mass<1)paths.push({weight:weight*(1-mass),events:[...events]});
      weight*=mass;
      if(weight<=0)break;
      // Co-prime strides decorrelate successive draws: reproducible, low-variance coverage.
      const stride=[1,37,19,53,29,43,11][sequence%7];
      const u=((index*stride+sequence*17)%sampleCount+.5)/sampleCount;
      const time=invert(values,u*mass,previous??0);
      if(time===null||time>=horizonHours-EPS){paths.push({weight,events:[...events]});break;}
      // The forecast resolution is one hour; share renewal tables across paths.
      previous=Math.max((previous??-1)+1,Math.ceil(time));
      if(previous>=horizonHours){paths.push({weight,events:[...events]});break;}
      events.push(previous);
    }
  }
  const merged=new Map();
  for(const path of paths) {
    const key=path.events.join(',');
    if(merged.has(key))merged.get(key).weight+=path.weight;
    else merged.set(key,path);
  }
  const scenarios=[...merged.values()];
  return {scenarios,table,origin,horizonHours,
    method:'stratified-renewal-scenarios',resolutionHours:1};
}

/** The shared reset rule at a simulated state: the next reset counts only if
 * it is likely before the refresh in effect, and is aimed at its conservative
 * time (the same rule as confidentResetTimes for the plotted plan). */
function confidentNextHour(values,time,normal,horizon) {
  const before=values[Math.min(values.length-1,Math.floor(time))]??0;
  const end=values[Math.min(values.length-1,Math.floor(Math.min(normal,horizon)))]??before;
  if(before>=1-EPS)return null;
  const probability=(end-before)/(1-before);
  if(probability<resetAssumptionRule.countProbability)return null;
  return conditionalQuantile(values,time,resetAssumptionRule.timingQuantile*probability,horizon);
}

function conditionalQuantile(values,start,q,horizon) {
  const before=values[Math.min(values.length-1,Math.floor(start))]??0;
  const target=before+(1-before)*q;
  for(let h=Math.floor(start)+1;h<=horizon;h++)if(values[h]>=target)return h;
  return null;
}

/** Roll out a feedback policy. Decisions only observe events already received,
 * never a scenario's future events. Review pace after each actual refill and
 * at the forecast deadline; redeem at depletion, after a bounded wait, or at
 * an expiring bank's safety deadline. All replenishments restart the week.
 */
export function simulateResetPolicy({base,policy,scenario,forecast,targetDailyPercent,
  heldResetIndices=[],requiredResetIndices=[],stopAtFirstNormal=false}) {
  const horizon=forecast.horizonHours,at=h=>new Date(forecast.origin+h*HOUR).toISOString();
  const held=new Set(heldResetIndices),required=new Set(requiredResetIndices),used=new Set(),expired=new Set();
  const segments=[],events=[],publicEvents=scenario.events;
  let time=0,quota=base.remainingPercent,normal=base.normalResetInHours,publicIndex=0,lastPublic=null;
  let daily=targetDailyPercent,review=Infinity,bankNotBefore=null,publicCount=0,plannedRest=false;
  let scheduleStart=0,scheduleDeadline=null,availability=null,forecastMissed=false;
  const availableGoal=policy.usageStrategy==='keep-available';
  const scheduled=policy.usageStrategy&&policy.usageStrategy!=='balanced'&&!availableGoal;
  // "Keep pace" answers: at my current pace, when do I run out? Its pace is
  // never retargeted; scheduled strategies allocate by calendar instead.
  let calendar=null;
  if(scheduled) {
    const zone=base.timeZone??'UTC',calendars=forecast.calendars??=new Map();
    if(!calendars.has(zone))calendars.set(zone,usageStrategyCalendar({now:base.now,
      timeZone:zone,horizonHours:horizon+WEEK}));
    calendar=calendars.get(zone);
  }
  let work=0,pause=0,restHours=0,nearTermPause=0,deviation=0,overwritten=0,firstNormal=null,quotaBankSource=null,bankOptionLost=0,bankReserveSpent=0;
  // A redeemed bank is a scarce option. If another refill overwrites most of
  // it while the original bank would still be valid, redemption destroyed an
  // option that waiting could have preserved. An already-expiring bank has
  // no such future option: never penalize salvaging it before expiry.
  const loseBankOption=()=>{
    if(quotaBankSource!==null)bankOptionLost+=Math.min(quota,
      targetDailyPercent*Math.max(0,base.resets[quotaBankSource].expiresInHours-time)/24);
    quotaBankSource=null;
  };
  const live=()=>base.resets.map((reset,index)=>({...reset,index}))
    .filter(reset=>!used.has(reset.index)&&!expired.has(reset.index)&&reset.expiresInHours>time+EPS);
  const choosePace=()=>{
    daily=targetDailyPercent;
    review=Infinity;plannedRest=false;
    if(availableGoal) {
      const deadlines=live().filter(reset=>!held.has(reset.index)&&(required.has(reset.index)||policy.useExpiring))
        .map(reset=>Math.min(reset.expiresInHours-1,normal-1)).filter(hour=>hour>time+EPS);
      const bankDeadline=deadlines.length ? Math.min(...deadlines) : null;
      // Optimistic: aim at the next counted reset (the plan's assumed times when
      // given, else the next confident one); cautious: known supply only.
      const forecastHour=policy.availabilityMode==='optimistic'&&!forecastMissed
        ? policy.referenceTimes ? policy.referenceTimes.find(hour=>hour>time+EPS&&hour<normal-EPS)??null
        : confidentNextHour(forecast.table(lastPublic),time,normal,horizon) : null;
      availability=availabilityPace({quota,time,normalHour:normal,targetDailyPercent,
        forecastHour,bankDeadline,forecastMissed});
      daily=Math.min(availability.dailyPercent,policy.dailyCapacityPercent??Infinity);
      availability={...availability,dailyPercent:daily};review=availability.deadline;
      return;
    }
    // Forecast times and expiring banks only end a phase here; pace comes from
    // the strategy: kept for "keep pace", allocated by calendar otherwise.
    if(policy.referenceTimes||policy.quantile!==null) {
      const target=policy.referenceTimes ? policy.referenceTimes.find(hour=>hour>time+EPS)??null
        : conditionalQuantile(forecast.table(lastPublic),time,policy.quantile,horizon);
      if(target!==null&&target<normal-EPS)review=target;
    }
    if(policy.useExpiring) {
      const bank=live().find(reset=>!held.has(reset.index)&&reset.expiresInHours-1>time+EPS
        &&reset.expiresInHours-1<normal-EPS);
      if(bank)review=Math.min(review,bank.expiresInHours-1);
    }
    if(scheduled) {
      let deadline=Math.min(review,normal,horizon);
      for(const reset of live())if(!held.has(reset.index)&&(required.has(reset.index)||policy.useExpiring))
        if(reset.expiresInHours-1>time+EPS)deadline=Math.min(deadline,reset.expiresInHours-1);
      // Calendar-only reviews keep the same refill target and weekend choice.
      // Recompute after a real refill or after the forecast target is missed.
      if(scheduleDeadline!==null&&time<scheduleDeadline-EPS)deadline=scheduleDeadline;
      else {scheduleStart=time;scheduleDeadline=deadline;}
      // Without a stated capacity, never plan more than one full week's quota
      // in a day; a short window to the next refill otherwise asks for >100%/day.
      const allocation=calendar.allocate({strategy:policy.usageStrategy,start:time,end:deadline,
        quota:quota>EPS ? quota : 100,dailyCapacityPercent:policy.dailyCapacityPercent??MAXIMUM_SCHEDULED_DAILY_PERCENT,cycleStart:scheduleStart});
      daily=allocation.dailyPercent;plannedRest=allocation.rest;
      review=Math.min(review,allocation.nextChange);
    }
  };
  choosePace();
  for(let guard=0;time<horizon-EPS;guard++) {
    if(guard>4096)throw new Error('Reset policy did not advance');
    // Public and normal refills take precedence over a simultaneous bank use.
    if(publicEvents[publicIndex]<=time+EPS) {
      publicIndex++;publicCount++;lastPublic=time;
      loseBankOption();
      events.push({kind:'public-reset',atHours:time,at:at(time),overwrittenPercent:quota,nextNormalResetAt:at(time+WEEK)});
      quota=100;normal=time+WEEK;bankNotBefore=null;scheduleDeadline=null;forecastMissed=false;choosePace();continue;
    }
    if(normal<=time+EPS) {
      loseBankOption();
      events.push({kind:'normal-refresh',atHours:time,at:at(time),overwrittenPercent:quota,nextNormalResetAt:at(time+WEEK)});
      firstNormal??=time;quota=100;normal=time+WEEK;bankNotBefore=null;scheduleDeadline=null;forecastMissed=false;
      if(stopAtFirstNormal)break;
      choosePace();continue;
    }
    for(const reset of live())if(reset.expiresInHours<=time+EPS)expired.add(reset.index);
    if(scheduled&&review<=time+EPS)choosePace();
    const available=live().filter(reset=>!held.has(reset.index));
    const committed=available.find(reset=>required.has(reset.index)
      &&Math.min(reset.expiresInHours-1,normal-1)<=time+EPS);
    const expiring=policy.useExpiring ? available.find(reset=>reset.expiresInHours-1<=time+EPS) : null;
    const bridge=policy.bankMode!=='reserve';
    // Extra banks bridge any outage, earliest expiry first; the last one only
    // a real outage before the next known refill.
    const spendable=available.length>1||normal-time>=LAST_BANK_MINIMUM_OUTAGE_HOURS-EPS;
    if(bridge&&quota<=EPS&&!plannedRest&&bankNotBefore===null&&available.length&&spendable) {
      // 'forecast': wait for the next likely reset (its conservative time) so a
      // bank is not spent just before a free refill; capped at two days.
      let wait=policy.waitHours;
      if(wait==='forecast') {
        const next=policy.referenceTimes ? policy.referenceTimes.find(hour=>hour>time+EPS&&hour<normal-EPS)??null
          : confidentNextHour(forecast.table(lastPublic),time,normal,horizon);
        wait=next===null ? 0 : Math.min(FORECAST_BANK_WAIT_CAP_HOURS,next-time);
      }
      bankNotBefore=time+wait;
    }
    const depleted=bridge&&quota<=EPS&&!plannedRest&&bankNotBefore!==null&&bankNotBefore<=time+EPS&&available.length
      ? available.reduce((soonest,reset)=>reset.expiresInHours<soonest.expiresInHours ? reset : soonest) : null;
    const bank=committed??expiring??depleted;
    if(bank) {
      const before=quota;
      // Spending the last live bank costs more than spending one of several.
      // A bank about to expire has little option value left to preserve.
      bankReserveSpent+=100/available.length*Math.min(1,
        targetDailyPercent*Math.max(0,bank.expiresInHours-time)/2400);
      loseBankOption();
      events.push({kind:'backup',atHours:time,at:at(time),resetIndex:bank.index,
        expiresOn:bank.expiresOn,expiresAt:bank.expiresAt,overwrittenPercent:before,
        reason:committed ? 'committed-before-refresh' : expiring ? 'expiry-deadline' : 'quota-exhausted',
        required:!!committed,deadlineDriven:!!expiring,nextNormalResetAt:at(time+WEEK)});
      overwritten+=before;used.add(bank.index);quota=100;quotaBankSource=bank.index;
      normal=time+WEEK;bankNotBefore=null;scheduleDeadline=null;choosePace();continue;
    }
    if(review<=time+EPS) {
      if(availableGoal&&availability?.usesForecast)forecastMissed=true;
      choosePace();
    }
    const deadlines=available.map(reset=>required.has(reset.index)
      ? Math.min(reset.expiresInHours-1,normal-1) : policy.useExpiring ? reset.expiresInHours-1 : Infinity)
      .filter(hour=>hour>time+EPS);
    const depletion=quota>EPS&&daily>EPS ? time+quota*24/daily : Infinity;
    const end=Math.min(horizon,normal,publicEvents[publicIndex]??Infinity,review,
      depletion,...deadlines,...base.resets.filter((_,index)=>!used.has(index)&&!expired.has(index))
        .map(reset=>reset.expiresInHours).filter(hour=>hour>time+EPS),
      quota<=EPS&&available.length&&bankNotBefore>time+EPS ? bankNotBefore : Infinity);
    if(end<=time+EPS)throw new Error('Invalid reset policy boundary');
    const before=quota,duration=end-time,consumed=quota>EPS ? Math.min(quota,daily*duration/24) : 0;
    quota=Math.max(0,quota-consumed);work+=consumed;
    if(plannedRest)restHours+=duration;
    else if(before<=EPS) {
      pause+=duration;
      nearTermPause+=Math.max(0,Math.min(end,resetPolicyObjective.nearTermHours)-time);
    }
    else if(!scheduled)deviation+=((daily/targetDailyPercent-1)**2)*duration/24;
    segments.push({kind:plannedRest ? 'rest' : before>EPS ? 'quota' : 'pause',reason:plannedRest ? 'planned-rest' : before>EPS ? availability?.reason : 'no-resource',
      ...(availableGoal ? {availability} : {}),
      startHours:time,endHours:end,startAt:at(time),endAt:at(end),
      multiplier:before>EPS ? daily/base.averagePercentPerDay : 0,
      dailyPercent:before>EPS ? daily : 0,remainingBefore:before,remainingAfter:quota});
    time=end;
    for(const [index,reset] of base.resets.entries())if(!used.has(index)&&!expired.has(index)
      &&reset.expiresInHours<=time+EPS) {
      expired.add(index);events.push({kind:'expiry',resetIndex:index,atHours:time,at:at(time),expiresOn:reset.expiresOn});
    }
  }
  // An exact horizon-boundary refresh is a resource too. It must have the
  // same terminal treatment as a refresh one second before the boundary.
  if(normal<=time+EPS) {
    loseBankOption();
    events.push({kind:'normal-refresh',atHours:time,at:at(time),overwrittenPercent:quota,nextNormalResetAt:at(time+WEEK)});
    firstNormal??=time;quota=100;normal=time+WEEK;
  }
  const remainingBanks=base.resets.filter((_,index)=>!used.has(index)&&!expired.has(index));
  // Follow every policy at the requested pace to its next refill, holding
  // banks, and count any outage on the way. Otherwise a policy could look
  // better merely because the evaluation window ends between its outages.
  let tailPause=0;
  if(!stopAtFirstNormal&&normal>time+EPS) {
    const depletion=time+(quota>EPS ? quota*24/targetDailyPercent : 0);
    tailPause=Math.max(0,normal-depletion);
  }
  const futureBank=remainingBanks.reduce((sum,reset)=>sum+Math.min(100,
    targetDailyPercent*Math.max(0,reset.expiresInHours-time)/24),0);
  pause+=tailPause;
  const utility=work/targetDailyPercent-resetPolicyObjective.interruptionPerDay*pause/24
    -resetPolicyObjective.nearTermInterruptionPerDay*nearTermPause/24
    -resetPolicyObjective.paceDeviationPerDay*deviation
    -resetPolicyObjective.overwriteCost*overwritten/targetDailyPercent
    -resetPolicyObjective.bankOptionLossCost*bankOptionLost/targetDailyPercent
    -resetPolicyObjective.bankScarcityCost*bankReserveSpent/targetDailyPercent
    +resetPolicyObjective.futureResourceValue*(quota+futureBank)/targetDailyPercent;
  return {utility,work,pauseHours:pause,restHours,nearTermPauseHours:nearTermPause,banksUsed:used.size,expiredUnused:expired.size,bankOptionLost,bankReserveSpent,
    bankUseProbability:used.size ? 1 : 0,pauseProbability:pause>EPS ? 1 : 0,
    bankBeforeOriginalRefreshProbability:events.some(event=>event.kind==='backup'
      &&event.atHours<base.normalResetInHours-EPS) ? 1 : 0,
    remainingQuota:quota,remainingBanks:remainingBanks.length,publicCount,
    segments,events,normalHour:stopAtFirstNormal&&firstNormal!==null ? firstNormal : normal,endHours:time,
    endKind:firstNormal!==null&&stopAtFirstNormal ? 'normal-refresh' : 'planning-horizon'};
}

/** The main recommendation is a conditional supply plan, not the no-reset
 * contingency. Free predicted refills take priority: if they cover current
 * use through both reference events, automatic bank redemption is forbidden.
 * The stochastic search remains the separate policy for forecast failure.
 */
export function forecastFirstPlan({base,prediction,search,heldResetIndices=[],requiredResetIndices=[],assumedResetCount='auto'}) {
  if(!prediction||assumedResetCount===0)return null;
  const origin=Date.parse(base.now);
  const {times,probabilities}=confidentResetTimes({prediction,now:base.now,normalHours:base.normalResetInHours,
    horizonHours:search.horizonHours,count:assumedResetCount});
  if(!times.length)return null;
  const forecast=publicResetScenarios({prediction:null,now:base.now,horizonHours:search.horizonHours});
  const targetDailyPercent=search.targetDailyPercent;
  const scheduled=search.usageStrategy&&search.usageStrategy!=='balanced';
  // Keep available counts these resets only in its optimistic mode.
  const availability=search.usageStrategy==='keep-available' ? {availabilityMode:'optimistic'} : {};
  const probe=simulateResetPolicy({base,policy:{quantile:null,bankMode:'reserve',waitHours:0,useExpiring:false,
      ...(scheduled ? {usageStrategy:search.usageStrategy,dailyCapacityPercent:search.dailyCapacityPercent,referenceTimes:times,...availability} : {})},
    scenario:{events:times},forecast,targetDailyPercent,stopAtFirstNormal:true});
  // Any outage in the plotted plan counts, including after the last assumed
  // reset; otherwise the plan could show a gap while holding a live bank.
  const shortageHours=probe.segments.filter(segment=>segment.kind==='pause')
    .reduce((sum,segment)=>sum+segment.endHours-segment.startHours,0);
  const covered=shortageHours<EPS;
  // Covered: no bridging, but an expiring bank may still be used before it is lost.
  const plans=covered ? [{bankMode:'reserve',waitHours:0,useExpiring:false},{bankMode:'reserve',waitHours:0,useExpiring:true}]
    : [...new Map(search.candidates.map(({policy})=>[
      `${policy.bankMode}:${policy.waitHours}:${policy.useExpiring}`,policy])).values()];
  const alternatives=plans.map(plan=>{
    const policy={...plan,quantile:null,referenceTimes:times,
      usageStrategy:search.usageStrategy,dailyCapacityPercent:search.dailyCapacityPercent,...availability};
    const outcome=simulateResetPolicy({base,policy,scenario:{events:times},forecast,targetDailyPercent,
      heldResetIndices,requiredResetIndices});
    return {policy,utility:outcome.utility,banksUsed:outcome.banksUsed,pauseHours:outcome.pauseHours};
  // Keep available ranks outages first, as its own policy search does.
  }).sort((a,b)=>(availability.availabilityMode ? a.pauseHours-b.pauseHours : 0)
    ||b.utility-a.utility||a.banksUsed-b.banksUsed);
  const policy=alternatives[0].policy;
  const trace=simulateResetPolicy({base,policy,scenario:{events:times},forecast,targetDailyPercent,
    heldResetIndices,requiredResetIndices,stopAtFirstNormal:true});
  let sequence=0;
  trace.events=trace.events.map(event=>event.kind==='public-reset'
    ? {...event,kind:'assumed-extra-reset',sequence:++sequence,hypothetical:true} : event);
  const fallback=simulateResetPolicy({base,policy,scenario:{events:[]},forecast,targetDailyPercent,
    heldResetIndices,requiredResetIndices,stopAtFirstNormal:true});
  const firstSegment=trace.segments[0];
  return {conditional:true,basis:'predicted-extra-resets-first',policy,trace,fallback,alternatives,
    assumedResetTimes:trace.events.filter(event=>event.kind==='assumed-extra-reset').map(event=>event.at),
    assumption:{count:assumedResetCount,rule:{...resetAssumptionRule},probabilities:probabilities.slice(0,times.length)},
    coverage:{currentUsageCovered:covered,through:new Date(origin+times.at(-1)*HOUR).toISOString(),shortageHours},
    firstAction:{dailyPercent:firstSegment?.dailyPercent??0,until:firstSegment?.endAt??null,
      backupPolicy:policy.bankMode,bankWaitHours:policy.bankMode==='reserve' ? null : policy.waitHours}};
}

/** Finite-policy stochastic rolling-horizon search, not a globally optimal
 * control law. Every candidate is evaluated on identical renewal histories.
 * Only the first action is recommended; observations trigger a new search.
 */
export function searchResetPolicies({base,prediction,targetDailyPercent,heldResetIndices=[],requiredResetIndices=[],
  sampleCount=64,horizonHours=336,usageStrategy='balanced',dailyCapacityPercent=null,includeBridgeAlternative=false,
  availabilityMode='optimistic',alertsEnabled=false}) {
  if(!validUsageStrategy(usageStrategy))throw new Error('Unknown usage strategy');
  if(!validAvailabilityMode(availabilityMode))throw new Error('Unknown availability mode');
  if(typeof alertsEnabled!=='boolean')throw new Error('Alerts must be enabled or disabled');
  if(dailyCapacityPercent!==null&&(!Number.isFinite(dailyCapacityPercent)||dailyCapacityPercent<=0))
    throw new Error('Daily capacity must be positive');
  if(!Number.isFinite(targetDailyPercent)||targetDailyPercent<=0
    ||!Number.isFinite(base?.averagePercentPerDay)||base.averagePercentPerDay<=0)
    throw new Error('Policy search needs positive observed and target daily usage');
  const forecast=publicResetScenarios({prediction,now:base.now,sampleCount,horizonHours});
  const policies=[];
  const availableGoal=usageStrategy==='keep-available';
  // Candidate grid: bridge now, after half a day, after a day, or once the next
  // likely reset has had its chance (a reset may still arrive), or hold; pace aimed at a 35/50/75% conditional quantile of
  // the next reset, or kept. A finite, explainable set, not a continuous optimum.
  const bankPlans=[...(prediction&&!availableGoal ? [0,12,24,'forecast'] : [0]).map(waitHours=>({bankMode:'bridge',waitHours})),
    {bankMode:'reserve',waitHours:0}];
  // Keep pace never retargets its pace, so only bank choices differ there.
  const paced=usageStrategy!=='balanced'&&!availableGoal;
  for(const quantile of prediction&&paced ? [null,.35,.5,.75] : [null])
    for(const {bankMode,waitHours} of bankPlans)for(const useExpiring of [false,true])
      policies.push({id:`${quantile??'keep'}:${bankMode}:${waitHours}:${useExpiring}`,quantile,waitHours,useExpiring,bankMode,
        usageStrategy,dailyCapacityPercent,...(availableGoal ? {availabilityMode} : {})});
  const evaluate=policy=>{
    const metrics={utility:0,work:0,pauseHours:0,nearTermPauseHours:0,banksUsed:0,expiredUnused:0,bankOptionLost:0,bankReserveSpent:0,bankUseProbability:0,pauseProbability:0,
      bankBeforeOriginalRefreshProbability:0};
    for(const scenario of forecast.scenarios) {
      const result=simulateResetPolicy({base,policy,scenario,forecast,targetDailyPercent,heldResetIndices,requiredResetIndices});
      for(const key of Object.keys(metrics))metrics[key]+=result[key]*scenario.weight;
    }
    return {policy,expected:metrics};
  };
  const candidates=policies.map(evaluate).sort((a,b)=>(availableGoal ? a.expected.pauseHours-b.expected.pauseHours : 0)
    ||b.expected.utility-a.expected.utility
    ||a.expected.pauseHours-b.expected.pauseHours||a.expected.banksUsed-b.expected.banksUsed);
  const selected=candidates[0];
  const fallback=simulateResetPolicy({base,policy:selected.policy,scenario:{events:[]},forecast,targetDailyPercent,
    heldResetIndices,requiredResetIndices,stopAtFirstNormal:true});
  const first=fallback.segments[0];
  // The emergency alternative holds the suggested rate, rather than silently
  // accelerating after spending the bank in expectation of another forecast.
  // Calendar constraints still apply. Offer only a branch consistent with the
  // already selected first action, not a different decision in the past.
  const bridge=includeBridgeAlternative ? simulateResetPolicy({base,
    policy:{...selected.policy,quantile:null,useExpiring:false,bankMode:'bridge',waitHours:0},
    scenario:{events:[]},forecast,targetDailyPercent:first?.dailyPercent>EPS ? first.dailyPercent : targetDailyPercent,
    heldResetIndices,requiredResetIndices,stopAtFirstNormal:true}) : null;
  const bridgeAlternative=bridge&&Math.abs((bridge.segments[0]?.dailyPercent??0)-(first?.dailyPercent??0))<EPS
    &&bridge.segments[0]?.kind===first?.kind ? {segments:bridge.segments,events:bridge.events,
      normalHour:bridge.normalHour,endHours:bridge.endHours,endKind:bridge.endKind} : null;
  const baseline=availableGoal ? evaluate({id:'current-usage',quantile:null,bankMode:'reserve',waitHours:0,
    useExpiring:false,usageStrategy:'balanced'}) : candidates.find(item=>item.policy.quantile===null&&item.policy.waitHours===0);
  return {method:'scenario-based-rolling-policy-search',optimality:'best-of-enumerated-feedback-policies',usageStrategy,dailyCapacityPercent,
    ...(availableGoal ? {availability:assessAvailability({base,first,trace:fallback,mode:availabilityMode,
      targetDailyPercent,alertsEnabled,
      probabilityByHours:prediction ? hours=>resetProbabilityByHours(prediction,hours) : null})} : {}),
    calibrated:prediction?.calibrated===true,forecastIncluded:!!prediction,
    objective:{...resetPolicyObjective},horizonHours,sampleCount,scenarioCount:forecast.scenarios.length,
    ...(includeBridgeAlternative ? {bridgeAlternative} : {}),
    targetDailyPercent,firstAction:{dailyPercent:first?.dailyPercent??targetDailyPercent,
      until:first?.endAt??null,bankWaitHours:selected.policy.bankMode==='reserve' ? null : selected.policy.waitHours,
      backupPolicy:selected.policy.bankMode},
    selected,baseline,candidates,fallback,scenarioSummary:{
      noPublicResetProbability:forecast.scenarios.filter(path=>!path.events.length).reduce((sum,path)=>sum+path.weight,0),
      twoOrMoreProbability:forecast.scenarios.filter(path=>path.events.length>=2).reduce((sum,path)=>sum+path.weight,0)},
    observationPolicy:'recompute-after-observed-reset-or-usage-change',
    probabilityBasis:'joint-sampled-renewal-histories; not second-curve-conditional-CDF'};
}
