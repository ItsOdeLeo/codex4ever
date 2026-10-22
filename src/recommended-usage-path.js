import { searchResetPolicies,forecastFirstPlan } from './reset-policy-search.js';
import { policyMilestones } from './strategy-milestones.js';
import { resetProbabilityByHours } from './local-predictor.js';

const EPS=1e-7,HOUR=3600000;

/** The one default for every surface (page, plugin page, MCP, CLI): count
 * predicted resets by confidence, at conservative times. Never override it
 * per surface; same inputs must give the same plan everywhere. */
export const DEFAULT_RECOMMENDATION_MODE='forecast-preview';

/** Adapt the selected feedback policy, or an explicit forecast-first preview.
 * Feedback keeps the selected no-event trace; it never promotes a forecast
 * refill into real inventory. Legacy preview callers retain their default.
 */
export function recommendedUsagePath(base,prediction,{targetDailyPercent,sampleCount=64,
  usageStrategy='balanced',dailyCapacityPercent=null,assumedResetCount='auto',recommendationMode=DEFAULT_RECOMMENDATION_MODE,
  availabilityMode='optimistic',alertsEnabled=false}={}) {
  const availableGoal=usageStrategy==='keep-available';
  // Keep available: cautious counts no predicted reset; optimistic counts them
  // like every other strategy (same rule, same conservative times).
  const cautious=availableGoal&&availabilityMode==='cautious';
  if(cautious)recommendationMode='feedback';
  const originalNormal=base.originalNormalResetAt??base.normalResetAt;
  const initial={...base,normalResetAt:originalNormal,
    normalResetInHours:(Date.parse(originalNormal)-Date.parse(base.now))/HOUR};
  const recommendation=searchResetPolicies({base:initial,prediction,targetDailyPercent,sampleCount,usageStrategy,dailyCapacityPercent,
    availabilityMode,alertsEnabled,
    heldResetIndices:base.heldResetIndices??[],requiredResetIndices:base.requiredResetIndices??[],
    includeBridgeAlternative:recommendationMode==='feedback'});
  const alternative=cautious ? null : forecastFirstPlan({base:initial,prediction,search:recommendation,assumedResetCount,
    heldResetIndices:base.heldResetIndices??[],requiredResetIndices:base.requiredResetIndices??[]});
  const primary=recommendationMode==='feedback' ? null : alternative;
  recommendation.robustFirstAction=recommendation.firstAction;
  recommendation.robustFallback=recommendation.fallback;
  recommendation.primary=primary;
  recommendation.mode=recommendationMode;
  if(recommendationMode==='feedback')recommendation.forecastAlternative=alternative;
  if(primary) {
    recommendation.firstAction=primary.firstAction;
    recommendation.fallback=primary.fallback;
  }
  const trace=primary?.trace??recommendation.fallback,at=hour=>new Date(Date.parse(base.now)+hour*HOUR).toISOString();
  const banks=trace.events.filter(event=>event.kind==='backup');
  const supplies=trace.events.filter(event=>event.kind!=='expiry');
  const levels=trace.segments.map((segment,index)=>{
    // Attach a refill to its preceding consumption segment. A bank at time 0
    // is carried by the first segment and remains a genuine instantaneous jump.
    const events=supplies.filter(event=>Math.abs(event.atHours-segment.endHours)<EPS
      ||index===0&&event.atHours<EPS);
    const expired=trace.events.filter(event=>event.kind==='expiry'
      &&Math.abs(event.atHours-segment.endHours)<EPS).map(event=>event.resetIndex);
    const outcome={startHours:segment.startHours,endHours:segment.endHours,startAt:segment.startAt,endAt:segment.endAt,
      multiplier:segment.multiplier,remainingBefore:segment.remainingBefore,remainingAfter:segment.remainingAfter,
      resetIndicesUsed:events.filter(event=>event.kind==='backup').map(event=>event.resetIndex),resetIndicesExpired:expired,events,
      creditsRemaining:base.credits.balance,creditsSpent:0,
      resetsRemaining:base.resets.filter((reset,i)=>reset.expiresInHours>segment.endHours+EPS
        &&!banks.some(event=>event.resetIndex===i&&event.atHours<=segment.endHours+EPS)).length,
      pauseHours:segment.kind==='pause' ? segment.endHours-segment.startHours : 0,
      usedDays:(segment.remainingBefore-segment.remainingAfter)/base.averagePercentPerDay,
      usageSegments:[segment],pauses:segment.kind==='pause' ? [segment] : []};
    const action={id:'recommended-policy',actionId:`policy:${index}`,multiplier:segment.multiplier,
      bankMode:events.some(event=>event.kind==='backup') ? 'when-needed' : 'hold',useCredits:false};
    return {index,startAt:segment.startAt,endAt:segment.endAt,state:{quota:segment.remainingBefore,
      resets:outcome.resetsRemaining,credits:base.credits.balance},selectedActionId:action.actionId,
      actions:[{id:action.actionId,action,outcome,recommended:true,
        fallback:{firstPauseAt:outcome.pauses[0]?.startAt??null,expiredResets:expired.length}}],
      resetProbability:0,onReset:{remainingPercent:100,action:'replan'}};
  });
  const result={...base,recommendation,fixedPace:false,
    normalResetInHours:trace.normalHour,normalResetAt:at(trace.normalHour),
    normalResetSource:supplies.some(event=>event.kind!=='normal-refresh') ? 'estimated-restarted-week' : 'entered-account-time',
    planningEndKind:trace.endKind,planningHorizonHours:recommendation.horizonHours,
    search:{policies:recommendation.candidates.length,scenarios:recommendation.scenarioCount,
      evaluations:recommendation.candidates.length*recommendation.scenarioCount},
    usageStrategy,dailyCapacityPercent,
    strategy:{...base.strategy,usageStrategy,dailyCapacityPercent,method:recommendation.method,
      optimality:primary ? 'forecast-priority-then-best-enumerated-bank-plan' : recommendation.optimality,
      fixedUserPace:false,priority:primary ? 'predicted-free-refills-before-banked-resets' : 'expected-work-continuity-and-future-resources',
      conditional:!!primary,assumedResetTimes:primary?.assumedResetTimes??[],
      plottedBranch:primary ? 'predicted-extra-resets-first' : 'no-further-public-reset',objective:recommendation.objective},
    decisionTree:{levels,selectedActionIds:levels.map(level=>level.selectedActionId)},
    options:[{id:'recommended-policy',conditional:!!primary,expected:primary ? null : recommendation.selected.expected,
      contingency:{steps:levels.map(level=>level.actions[0].outcome)}}],selectedOptionId:'recommended-policy'};
  result.milestones=policyMilestones(result,hour=>prediction ? resetProbabilityByHours(prediction,hour)??0 : 0);
  // Merge unchanged-rate reviews; calendar/review subdivisions are not actions.
  result.phasePlans=[];
  for(const segment of trace.segments) {
    const previous=result.phasePlans.at(-1);
    if(previous&&Math.abs(previous.dailyPercent-segment.dailyPercent)<EPS
      &&previous.plannedRest===(segment.kind==='rest')
      &&!supplies.some(event=>Math.abs(event.atHours-segment.startHours)<EPS)) {
      previous.endHours=segment.endHours;previous.endAt=segment.endAt;continue;
    }
    result.phasePlans.push({phaseIndex:result.phasePlans.length,startHours:segment.startHours,endHours:segment.endHours,
      startAt:segment.startAt,endAt:segment.endAt,multiplier:segment.multiplier,dailyPercent:segment.dailyPercent,
      baselineDailyPercent:targetDailyPercent,reason:segment.reason??(primary ? 'forecast-first-allocation' : 'scenario-optimized'),
      plannedRest:segment.kind==='rest',
      stageReason:segment.reason==='availability-missed-forecast' ? 'if-no-extra-reset-at-review' : 'recommended-policy',
      fixed:Math.abs(segment.dailyPercent-targetDailyPercent)<EPS,
      constrained:false,quotaBefore:segment.remainingBefore,
      resourceCycle:supplies.filter(event=>event.atHours<=segment.startHours+EPS).length});
  }
  result.backupChoices=backupChoicePositions(result,banks,at);
  return result;
}

/** A held bank follows the selected resource path, not the initial snapshot. */
export function backupChoicePositions(result,banks,at){
  const EPS=1e-6;
  const points=result.milestones.points,end=points.at(-1).hours;
  const quotaAt=hour=>{
    const segment=result.milestones.segments.find(segment=>segment.startHours<=hour+EPS && segment.endHours>hour+EPS);
    if(!segment)return points.at(-1).stateBefore.quota;
    const start=points.find(point=>Math.abs(point.hours-segment.startHours)<EPS).stateAfter.quota;
    return Math.max(0,start-(hour-segment.startHours)*segment.dailyPercent/24);
  };
  return result.resets.map((reset,index)=>{
    const used=banks.find(event=>event.resetIndex===index);
    const depleted=points.find(point=>point.reasons.includes('depletion') && point.hours<end-EPS
      && point.hours<reset.expiresInHours-EPS && point.stateAfter.quota<=EPS);
    const deadline=Math.max(0,reset.expiresInHours-1);
    const hours=used?.atHours ?? (depleted ? Math.min(depleted.hours,deadline) : deadline<end-EPS ? deadline : null);
    const actionable=hours!==null;
    return {index,...reset,used:!!used,held:(result.heldResetIndices??[]).includes(index),
      required:(result.requiredResetIndices??[]).includes(index),actionable,atHours:hours,at:actionable ? at(hours) : null,
      quotaAtDecision:actionable ? used?.overwrittenPercent??quotaAt(hours) : null,
      reason:used?.reason??(!actionable ? 'not-needed-before-refresh' : deadline<=hours+EPS ? 'expiry-deadline' : 'quota-exhausted'),
      expiresBeforeDepletion:!used && actionable && deadline<=hours+EPS && quotaAt(hours)>EPS};
  });
}
