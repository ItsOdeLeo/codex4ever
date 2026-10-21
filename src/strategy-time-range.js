import { paceChoices } from './usage-pace-steps.js';
import { confidentResetTimes,FORECAST_BANK_WAIT_CAP_HOURS } from './reset-policy-search.js';

const HOUR=3600000,WEEK=168,SLOWEST_COVERED_PACE=.5;

/** Presentation range shared by every choice in one planning snapshot.
 * Bound possible refills from the original account deadline, all banks and
 * both forecast actions, never from the selected path's terminal event. */
export function strategyTimeRange(result,{prediction=null,forecastEndHours=0}={}) {
  const origin=Date.parse(result.now);
  const hours=stamp=>(Date.parse(stamp)-origin)/HOUR;
  const original=hours(result.originalNormalResetAt??result.normalResetAt);
  const normal=Number.isFinite(original) ? original : result.normalResetInHours;
  let states=[{time:0,quota:result.remainingPercent,normal}];
  const first=prediction?.resetTimeMode??prediction?.resetTimeEstimate
    ??result.resetForecast?.timeMode??result.resetForecast?.timeEstimate;
  const second=prediction?.followingResetEstimate??result.resetForecast?.followingReset;
  const firstHours=hours(first?.pointAt),secondHours=hours(second?.pointAt);
  if(firstHours>0&&firstHours<=336) {
    states.push({time:firstHours,quota:100,normal:firstHours+WEEK});
    if(secondHours>firstHours)states.push({time:secondHours,quota:100,normal:secondHours+WEEK});
  }
  // The main plan assumes resets at conservative times; cover every count the
  // user can choose (up to two), not only the most likely hours.
  if(prediction) {
    const assumed=confidentResetTimes({prediction,now:result.now,normalHours:normal,count:2}).times;
    for(const time of assumed)if(time>0&&time<=336)states.push({time,quota:100,normal:time+WEEK});
  }
  for(const {expires,index} of (result.resets??[]).map((reset,index)=>({expires:reset.expiresInHours,index}))
    .filter(item=>Number.isFinite(item.expires)&&item.expires>0).sort((a,b)=>a.expires-b.expires)) {
    const extended=[...states];
    for(const state of states) {
      if(expires<=state.time)continue;
      // Only depletion or a genuine expiry can require a bank. Never assume
      // redeeming an unneeded, distant bank just before a free normal refresh.
      const multipliers=paceChoices.map(choice=>choice.multiplier);
      // Calendar strategies may run slower than the requested pace; cover half of it.
      if(result.recommendation)multipliers.push(result.recommendation.targetDailyPercent/result.averagePercentPerDay*SLOWEST_COVERED_PACE);
      const waits=result.recommendation ? [...new Set(result.recommendation.candidates.map(item=>item.policy.waitHours==='forecast' ? FORECAST_BANK_WAIT_CAP_HOURS : item.policy.waitHours))] : [0];
      const depletions=state.quota<=0 ? [state.time] : multipliers.flatMap(multiplier=>waits.map(wait=>state.time+state.quota*24/
          (result.averagePercentPerDay*multiplier)+wait))
          .filter(hour=>Number.isFinite(hour)&&hour<state.normal-1e-6&&hour<expires);
      const deadlines=expires<state.normal-1e-6 ? [expires] : [];
      // Library callers can explicitly require an otherwise unneeded use.
      // The page does not offer that action when no decision is needed.
      const forced=!depletions.length&&!deadlines.length&&(result.requiredResetIndices??[]).includes(index)
        ? [Math.max(state.time,Math.min(expires-1,state.normal-1))] : [];
      const lastUse=Math.max(-Infinity,...depletions,...deadlines,...forced);
      if(Number.isFinite(lastUse))extended.push({time:lastUse,quota:100,normal:lastUse+WEEK});
    }
    states=[...new Map(extended.map(state=>[`${state.time}:${state.quota}`,state])).values()];
  }
  const latestNormal=Math.max(...states.map(state=>state.normal));
  const windowEnd=hours(prediction?.nextResetWindow?.to);
  const forecastTail=prediction ? Math.min(336,Number.isFinite(windowEnd) ? Math.max(48,windowEnd) : 168) : 0;
  return Math.ceil(Math.max(1,latestNormal,forecastEndHours,forecastTail,
    ...[first?.toHours,second?.toHours,secondHours].filter(Number.isFinite)));
}
