const DAY=86_400_000;
const t95=[0,12.706,4.303,3.182,2.776,2.571,2.447,2.365,2.306,2.262,
  2.228,2.201,2.179,2.160,2.145,2.131,2.120,2.110,2.101,2.093,2.086,
  2.080,2.074,2.069,2.064,2.060,2.056,2.052,2.048,2.045,2.042];

// Normal survival, used only as a kernel around each observed interval. The
// resulting reset forecast is a mixture, not an imposed normal bell curve.
function normalSurvival(z) {
  const x=Math.abs(z)/Math.SQRT2,t=1/(1+.3275911*x);
  const tail=((((1.061405429*t-1.453152027)*t+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-x*x)/2;
  return z>=0 ? tail : 1-tail;
}

export function intervalSurvival(distribution,ageDays) {
  if(ageDays<=0)return 1;
  if(distribution.regime) {
    const boundary=distribution.regime.switchAgeDays;
    if(ageDays>Math.max(0,boundary)) {
      const before=boundary>0 ? kernelSurvival(distribution,boundary) : 1;
      const after=distribution.regime.afterDistribution;
      // No evidence for the post-campaign regime: leave the tail unresolved.
      return after ? before*kernelSurvival(after,ageDays)/kernelSurvival(after,Math.max(0,boundary)) : before;
    }
  }
  return kernelSurvival(distribution,ageDays);
}

// Each kernel's truncation at age 0 depends only on the distribution; the
// planner evaluates survival thousands of times, so compute it once.
const truncations=new WeakMap();
function kernelSurvival(distribution,ageDays) {
  if(ageDays<=0)return 1;
  const {intervals,bandwidthDays,priorEquivalentIntervals,meanIntervalDays}=distribution;
  if(!truncations.has(distribution))truncations.set(distribution,intervals.map(length=>normalSurvival(-length/bandwidthDays)));
  const truncation=truncations.get(distribution);
  const observed=intervals.reduce((sum,length,index)=>sum+normalSurvival((ageDays-length)/bandwidthDays)
    /truncation[index],0);
  return (observed+priorEquivalentIntervals*Math.exp(-ageDays/meanIntervalDays))
    /(intervals.length+priorEquivalentIntervals);
}

/** Rebase a learned campaign boundary after a hypothetical automatic reset. */
export function renewIntervalDistribution(distribution,resetAt) {
  return distribution?.regime ? {...distribution,regime:{...distribution.regime,
    switchAgeDays:(Date.parse(distribution.regime.endsAt)-resetAt)/DAY}} : distribution;
}

function fitIntervals(intervals,priorDailyProbability) {
  const mean=items=>items.length ? items.reduce((sum,value)=>sum+value,0)/items.length : null;
  const average=mean(intervals);
  const variance=intervals.length>1 ? intervals.reduce((sum,value)=>sum+(value-average)**2,0)/(intervals.length-1) : null;
  const error=variance===null ? null : (t95[Math.min(30,intervals.length-1)]??1.96)*Math.sqrt(variance/intervals.length);
  const confidence=error===null ? null : {level:.95,lowDays:Math.max(0,average-error),highDays:average+error,
    method:'student-t-mean-interval',sampleCount:intervals.length,
    assumption:'approximately-independent-intervals; not a next-reset prediction window'};
  const daily=average===null ? priorDailyProbability : -Math.expm1(-1/average);
  // Sparse observations cannot identify exact day bins. Spread each interval
  // continuously (at least one day), with two equivalent exponential-prior
  // intervals retaining an uncertain tail. This is an explicit uncalibrated
  // smoothing assumption; historical means/confidence intervals stay raw.
  const distribution=intervals.length ? {method:'positive-interval-kde-with-exponential-prior',intervals,
    bandwidthDays:Math.max(1,1.06*Math.sqrt(variance??0)*intervals.length**(-.2)),
    priorEquivalentIntervals:2,meanIntervalDays:average} : null;
  return {daily,distribution,meanIntervalDays:average,meanIntervalConfidence:confidence};
}

/** Campaign frequency uses only complete intervals inside the evidenced
 * campaign. Historical release-clock fitting is deliberately separate. */
export function resetIntervalModel(times,nowMs,timeZone,priorDailyProbability,campaign=null) {
  const localDay=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'});
  const eventDays=[...new Map(times.map(time=>[localDay.format(time),time])).values()];
  const all=eventDays.slice(1).map((time,index)=>({end:time,start:eventDays[index],days:(time-eventDays[index])/DAY}));
  const start=Date.parse(campaign?.startsAt),end=Date.parse(campaign?.endsAt);
  const active=campaign?.status==='active',ended=campaign?.status==='ended';
  const inside=all.filter(item=>item.start>=start&&item.end<end);
  const outside=campaign ? all.filter(item=>item.end<start||item.start>=end) : all;
  const after=all.filter(item=>item.start>=end);
  const eligible=ended ? after : all;
  const recent=eligible.filter(item=>item.start>=nowMs-30*DAY);
  const campaignFit=active&&inside.length>0;
  const chosen=campaignFit ? inside : recent.length ? recent : ended ? outside : all;
  const intervals=chosen.map(item=>item.days),fit=fitIntervals(intervals,priorDailyProbability);
  if(campaignFit&&fit.distribution) {
    const fallback=fitIntervals(outside.map(item=>item.days),priorDailyProbability);
    fit.distribution.regime={endsAt:campaign.endsAt,switchAgeDays:(end-times.at(-1))/DAY,
      afterDistribution:fallback.distribution,
      afterSource:fallback.distribution ? 'non-campaign-historical-intervals' : 'unavailable',
      afterSampleCount:outside.length};
  }
  const bins=Math.min(366,Math.max(60,Math.ceil(Math.max(0,...intervals))+8));
  const hazards=fit.distribution ? Array.from({length:bins},(_,day)=>
    1-intervalSurvival(fit.distribution,day+1)/intervalSurvival(fit.distribution,day)) : [];
  return {...fit,hazards,intervals,source:fit.meanIntervalDays===null ? 'manual-prior'
    : campaignFit ? 'campaign-intervals' : recent.length ? 'recent-30-day-intervals'
    : ended ? 'non-campaign-historical-intervals' : 'historical-interval-fallback',
    selectionReason:active&&!campaignFit ? 'campaign-has-no-complete-interval'
      : ended ? 'campaign-ended' : null,
    sampleCount:intervals.length,sampleFrom:chosen.length ? new Date(chosen[0].start).toISOString() : null,
    sampleTo:chosen.length ? new Date(chosen.at(-1).end).toISOString() : null,
    windowDays:campaignFit ? null : 30,recentIntervalCount:recent.length,
    campaignIntervalCount:inside.length,
    campaignEventCount:eventDays.filter(time=>time>=start&&time<end).length,
    historicalMeanIntervalDays:all.length ? all.reduce((sum,item)=>sum+item.days,0)/all.length : null,
    recentEventDays:eventDays.filter(time=>time>=nowMs-30*DAY).length,
    recentCoverageDays:times.length ? Math.min(30,(nowMs-times[0])/DAY) : 0,
    priorEquivalentIntervals:2};
}
