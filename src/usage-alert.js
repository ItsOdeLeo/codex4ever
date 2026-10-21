// Usage alerts: compare real remaining quota with the plan made earlier.
// One rule for every surface (plugin reminders, MCP check, CLI demo).
const HOUR=3600000;

export const usageAlertRule=Object.freeze({
  overPlanPercent:5,    // used this many points of weekly quota more than planned
  earlierFraction:.2,   // or: the current pace runs out this share of the planned span earlier
  minimumElapsedHours:1 // a pace needs at least an hour of observation
});

/** Plain, JSON-safe record of the plan's expected remaining quota until its
 * first refill, from a planUsagePath result. Later phases assume refills and
 * cannot be compared with the account until it is read again. */
export function alertBaseline(result) {
  if(!result?.available||!Array.isArray(result.phasePlans))return null;
  const phases=result.phasePlans.filter(phase=>(phase.resourceCycle??0)===0)
    .map(phase=>({startAt:phase.startAt,endAt:phase.endAt,quotaBefore:phase.quotaBefore,
      dailyPercent:phase.plannedRest ? 0 : phase.dailyPercent}));
  if(!phases.length)return null;
  let plannedDepletionAt=null;
  for(const phase of phases) {
    if(phase.dailyPercent<=0||phase.quotaBefore<=0)continue;
    const depletion=Date.parse(phase.startAt)+phase.quotaBefore*24/phase.dailyPercent*HOUR;
    if(depletion<=Date.parse(phase.endAt)+1){plannedDepletionAt=new Date(depletion).toISOString();break;}
  }
  return {createdAt:result.now,remainingPercent:result.remainingPercent,
    normalResetAt:result.originalNormalResetAt??result.normalResetAt,
    usageStrategy:result.usageStrategy??'balanced',validUntil:phases.at(-1).endAt,plannedDepletionAt,phases};
}

/** Planned remaining quota at a time inside the baseline, or null outside it. */
export function plannedRemainingAt(baseline,at) {
  const time=Date.parse(at);
  for(const phase of baseline.phases) {
    const start=Date.parse(phase.startAt),stop=Date.parse(phase.endAt);
    if(time>=start&&time<=stop)return Math.max(0,phase.quotaBefore-phase.dailyPercent*(time-start)/HOUR/24);
  }
  return null;
}

/** Compare a fresh account snapshot with a baseline. `suggestedDailyPercent`
 * comes from replanning now with the same planner. */
export function checkUsageAgainstPlan({baseline,snapshot,suggestedDailyPercent=null,timeZone='UTC',language='zh-CN'}) {
  if(!baseline)return {status:'no-plan'};
  const now=Date.parse(snapshot?.readAt),actual=snapshot?.weekly?.remainingPercent;
  if(!Number.isFinite(now)||!Number.isFinite(actual))return {status:'no-reading'};
  // A refill moves the account's refresh time (every refill restarts the
  // week) or raises the quota: the old plan no longer applies.
  const resetAt=Date.parse(snapshot.weekly.resetAt),plannedReset=Date.parse(baseline.normalResetAt);
  if(Number.isFinite(resetAt)&&Number.isFinite(plannedReset)&&Math.abs(resetAt-plannedReset)>HOUR
    ||actual>baseline.remainingPercent+.5)return {status:'refilled'};
  const expected=plannedRemainingAt(baseline,new Date(now).toISOString());
  if(expected===null)return {status:'stale'};
  const overPercent=expected-actual;
  const elapsedHours=(now-Date.parse(baseline.createdAt))/HOUR;
  const used=baseline.remainingPercent-actual;
  let projectedDepletionAt=null,earlierHours=null;
  if(elapsedHours>=usageAlertRule.minimumElapsedHours&&used>0) {
    const rate=used*24/elapsedHours;
    projectedDepletionAt=new Date(now+actual*24/rate*HOUR).toISOString();
    const plannedEnd=Date.parse(baseline.plannedDepletionAt??baseline.validUntil);
    const plannedSpan=plannedEnd-Date.parse(baseline.createdAt);
    const projectedSpan=Date.parse(projectedDepletionAt)-Date.parse(baseline.createdAt);
    if(plannedSpan>0&&projectedSpan<plannedSpan*(1-usageAlertRule.earlierFraction))
      earlierHours=(plannedEnd-Date.parse(projectedDepletionAt))/HOUR;
  }
  const status=overPercent>=usageAlertRule.overPlanPercent-1e-9||earlierHours!==null ? 'over-plan' : 'on-track';
  // Default suggestion: the pace that still lasts until the planned end.
  const plannedEnd=Date.parse(baseline.plannedDepletionAt??baseline.validUntil);
  suggestedDailyPercent??=plannedEnd>now ? actual*24/((plannedEnd-now)/HOUR) : null;
  const facts={status,expectedRemainingPercent:expected,actualRemainingPercent:actual,overPercent,
    projectedDepletionAt,plannedDepletionAt:baseline.plannedDepletionAt,earlierHours,suggestedDailyPercent,
    rule:{...usageAlertRule}};
  return {...facts,message:status==='over-plan' ? alertMessage(facts,{timeZone,language}) : null};
}

const percent=value=>`${Number(value.toFixed(1))}%`;

export function alertMessage(facts,{timeZone='UTC',language='zh-CN'}={}) {
  const zh=language==='zh-CN';
  const date=value=>new Intl.DateTimeFormat(zh ? 'zh-CN' : 'en-GB',{timeZone,month:zh ? 'long' : 'short',
    day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value));
  const lines=[];
  if(facts.overPercent>0)lines.push(zh
    ? `比计划多用了 ${percent(facts.overPercent)}（计划剩 ${percent(facts.expectedRemainingPercent)}，实际剩 ${percent(facts.actualRemainingPercent)}）。`
    : `${percent(facts.overPercent)} over plan (planned ${percent(facts.expectedRemainingPercent)} left, actually ${percent(facts.actualRemainingPercent)}).`);
  if(facts.projectedDepletionAt)lines.push(zh
    ? `按现在的速度会在 ${date(facts.projectedDepletionAt)} 用完${facts.earlierHours ? `，比计划早 ${Math.round(facts.earlierHours)} 小时` : ''}。`
    : `At this pace quota runs out ${date(facts.projectedDepletionAt)}${facts.earlierHours ? `, ${Math.round(facts.earlierHours)} h earlier than planned` : ''}.`);
  if(Number.isFinite(facts.suggestedDailyPercent))lines.push(zh
    ? `建议把用量降到每天 ${percent(facts.suggestedDailyPercent)}。`
    : `Consider lowering usage to ${percent(facts.suggestedDailyPercent)} per day.`);
  return lines.join(zh ? '' : ' ');
}
