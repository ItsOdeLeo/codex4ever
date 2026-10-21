const HOUR=3600000,EPS=1e-7;

// Product preferences, not measured forecast accuracy. The optimistic target
// is the model's 80th percentile, not its mode or a guaranteed supply event.
// Keep-available: hold back a 5% margin (at most a fifth of what is left); the
// optimistic mode spends toward the next reset only under the shared rule
// (likely before the refresh in effect, at its conservative time).
export const availabilityDefaults=Object.freeze({bufferPercent:5});
export const validAvailabilityMode=value=>['cautious','optimistic'].includes(value);

/** Allocate only existing quota. On a missed forecast, spend part of the
 * emergency margin slowly until the known refresh, preserving some headroom.
 * Called only at observations/deadlines; it never sees future scenario events.
 */
export function availabilityPace({quota,time,normalHour,targetDailyPercent,forecastHour=null,
  bankDeadline=null,forecastMissed=false}) {
  const reserve=Math.min(availabilityDefaults.bufferPercent,quota*.2);
  const knownDeadline=Math.min(normalHour,bankDeadline??Infinity);
  const useForecast=!forecastMissed&&forecastHour!==null&&forecastHour>time+EPS
    &&forecastHour<knownDeadline-EPS&&quota>availabilityDefaults.bufferPercent+EPS;
  const deadline=useForecast ? forecastHour : knownDeadline;
  const capacity=targetDailyPercent*(bankDeadline!==null&&deadline===bankDeadline ? 2 : 1);
  return {dailyPercent:quota>EPS&&deadline>time+EPS
    ? Math.min(capacity,Math.max(0,quota-reserve)*24/(deadline-time)) : 0,
    deadline,reserve,usesForecast:useForecast,
    reason:useForecast ? 'availability-forecast-budget' : forecastMissed
      ? 'availability-missed-forecast' : 'availability-known-supply'};
}

/** Facts for web and MCP warnings, derived from the policy actually selected. */
export function assessAvailability({base,first,trace,mode,targetDailyPercent,probabilityByHours,alertsEnabled}) {
  const origin=Date.parse(base.now),at=h=>new Date(origin+h*HOUR).toISOString();
  const consumptionHours=base.remainingPercent*24/targetDailyPercent;
  const early=consumptionHours<base.normalResetInHours-EPS;
  const point=first?.availability??null;
  const deadline=point?.deadline??base.normalResetInHours;
  const p=early&&probabilityByHours ? probabilityByHours(Math.max(0,consumptionHours)) : 0;
  const cdf=value=>Number.isFinite(value) ? Math.max(0,Math.min(1,value)) : null;
  const status=base.remainingPercent<=EPS ? 'empty'
    : targetDailyPercent>(first?.dailyPercent??0)+EPS ? 'too-fast' : 'on-track';
  const fallback=trace.segments.find(segment=>segment.startHours>=deadline-EPS
    &&segment.reason==='availability-missed-forecast');
  return {goal:'keep-available',mode,bufferPercent:availabilityDefaults.bufferPercent,
    status,currentDailyPercent:targetDailyPercent,suggestedDailyPercent:first?.dailyPercent??0,
    reviewAt:at(deadline),reserveTarget:point?.reserve??Math.min(availabilityDefaults.bufferPercent,base.remainingPercent*.2),
    reserveAtReview:Math.max(0,(first?.remainingBefore??base.remainingPercent)-(first?.dailyPercent??0)*deadline/24),
    forecastUsed:point?.usesForecast??false,
    forecastRule:mode==='optimistic' ? 'shared-confident-reset-rule' : null,
    probabilityOfResetByReview:probabilityByHours ? cdf(probabilityByHours(deadline)) : null,
    currentPaceDepletionAt:early ? at(consumptionHours) : null,
    // This is a first-event probability before a fixed depletion time. It is
    // not the chance of an outage under the adaptive plan or bank fallback.
    noResetBeforeCurrentPaceDepletion:early ? (cdf(p)===null ? null : 1-cdf(p)) : 0,
    ifNoReset:point?.usesForecast ? {at:at(deadline),dailyPercent:fallback?.dailyPercent??null,
      action:'reduce-and-replan',normalRefreshAt:base.normalResetAt} : null,
    notification:{enabled:alertsEnabled,shouldNotify:alertsEnabled&&status!=='on-track',
      trigger:'on-plan-check',code:status==='empty' ? 'quota-empty' : status==='too-fast' ? 'pace-too-fast' : null}};
}
