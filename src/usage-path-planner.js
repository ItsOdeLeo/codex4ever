import { planIntensityUsage } from './intensity-plan.js';
import { resetProbabilityByHours } from './local-predictor.js';
import { strategyResetForecast,forecastAssumptionCards,conservativeResetTimes } from './reset-forecast.js';
import { phaseResetOpportunities } from './phase-reset-opportunities.js';
import { paceChoices } from './usage-pace-steps.js';
import { recommendedUsagePath,DEFAULT_RECOMMENDATION_MODE } from './recommended-usage-path.js';
import { validUsageStrategy } from './usage-strategy.js';
import { accountResourceState } from './account-resource-state.js';
export { paceChoices } from './usage-pace-steps.js';

const HOUR = 3_600_000;
const EPS = 1e-7;
// Options of solvers that no longer exist. Rejected loudly so no caller can
// believe it chose different planning rules.
const REMOVED_OPTIONS = ['adaptivePace','optimizePolicy','flexibleSchedule','fixedPace','phasePaceOverrides',
  'decisionPath','assumeMostLikelyReset','assumeSecondReset'];

/** The one planning algorithm, shared by the page, the plugin page, the MCP
 * and the CLI: scenario search over waits and bank timing
 * (searchResetPolicies), with predicted resets counted by confidence at
 * conservative times (forecastFirstPlan). paceMultiplier sets the target
 * daily use relative to the observed average; it is a target, not a lock.
 * Restarting the weekly timer after any replenishment is a confirmed rule;
 * the real account's refreshed resetsAt remains authoritative. */
export function planUsagePath({ input, now = new Date(), timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
  prediction = null, averagePercentPerDay = null, paceMultiplier = 1,
  heldResetIndices = [], requiredResetIndices = [],
  usageStrategy='balanced',dailyCapacityPercent=null,usageSnapshot=null,
  recommendationMode=DEFAULT_RECOMMENDATION_MODE,availabilityMode='optimistic',alertsEnabled=false,assumedResetCount='auto',
  ...other } = {}) {
  const removed=REMOVED_OPTIONS.filter(key=>key in other);
  if(removed.length)throw new Error(`只有一种规划算法；已移除参数：${removed.join(', ')}`);
  if(!['forecast-preview','feedback'].includes(recommendationMode))throw new Error('Unknown recommendation mode');
  if(!validUsageStrategy(usageStrategy))throw new Error('Unknown usage strategy');
  if(!['auto',0,1,2].includes(assumedResetCount))throw new Error('假设重置次数需为自动或 0–2');
  if (!paceChoices.some(choice => choice.multiplier === paceMultiplier))
    throw new Error('使用强度请选择保持当前，或增加10%、20%、30%、50%、100%');
  if (input?.allowCredits !== undefined && typeof input.allowCredits !== 'boolean')
    throw new Error('是否愿意使用 Credits 需为是或否');
  const { options, ...base } = usageSnapshot
    ? accountResourceState(usageSnapshot,{now,timeZone,prediction})
    : planIntensityUsage({ input, now, timeZone, prediction });
  if (averagePercentPerDay !== null) {
    if (!Number.isFinite(averagePercentPerDay) || averagePercentPerDay <= 0)
      throw new Error('已观察的平均消耗需大于零');
    base.averagePercentPerDay = averagePercentPerDay;
    base.available = true;
    base.paceSource = 'provided-observation';
    delete base.reason;
  } else base.paceSource = base.evenSplit ? 'even-split' : 'normal-window-average';
  base.credits = { balance: input?.credits ?? 0, allowed: input?.allowCredits === true,
    unit: 'credits', included: false, quantified: false, consumption: 'user-estimated', bridge: null };
  base.creditsCostSource = 'not-estimated';
  if (!base.available) return { ...base, options: [], strategy: null };
  const rate = base.averagePercentPerDay;
  const resets = base.resets;
  if (!Array.isArray(heldResetIndices) || heldResetIndices.some(index => !Number.isInteger(index)
    || index < 0 || index >= resets.length)) throw new Error('保留的备用 reset 索引无效');
  if(!Array.isArray(requiredResetIndices) || requiredResetIndices.some(index=>!Number.isInteger(index)
    || index<0 || index>=resets.length || heldResetIndices.includes(index)))throw new Error('必须使用的备用索引无效或同时选择了保留');
  const at = hour => new Date(Math.round(now.getTime() + hour * HOUR)).toISOString();
  const cumulative = hour => prediction ? resetProbabilityByHours(prediction, hour) ?? 0 : 0;
  const calendar=prediction ? forecastCalendar(base,at,cumulative,336) : [];
  const targetDailyPercent=rate*paceMultiplier;
  const result=recommendedUsagePath({...base,adaptivePace:true,flexibleSchedule:true,paceMultiplier,paceChoices,
    heldResetIndices,requiredResetIndices,originalNormalResetAt:base.normalResetAt,
    forecastCalendar:calendar,startingPoint:{intent:'steady',multiplier:targetDailyPercent/rate,dailyPercent:targetDailyPercent},
    resetWindowAssumption:'restart-seven-days-on-every-replenishment; confirmed'},prediction,
    {targetDailyPercent,usageStrategy,dailyCapacityPercent,recommendationMode,availabilityMode,alertsEnabled,assumedResetCount});
  result.resetForecast=strategyResetForecast(result,prediction);
  const primary=result.recommendation?.primary;
  if(!primary) {
    // No counted plan (keep-available, feedback, or forecast off): the page
    // still shows unselected assumption cards at the conservative times.
    result.forecastScenario=forecastAssumptionCards(result,prediction);
    return phaseResetOpportunities(result,prediction);
  }
  const assumptions=primary.trace.events.filter(event=>event.kind==='assumed-extra-reset');
  const following=result.resetForecast.followingReset;
  // Cards sit where the plotted refill happens: the assumed, conservative time.
  const conservative=conservativeResetTimes(result,prediction);
  const firstAt=assumptions[0]?.at??conservative[0]??prediction.resetTimeMode.pointAt;
  result.forecastScenario={available:true,conditional:true,selected:assumptions.length>0,
    secondSelected:assumptions.length>1,at:firstAt,
    hours:(Date.parse(firstAt)-Date.parse(result.now))/HOUR,
    assumptionRule:primary.assumption,
    currentDailyPercent:result.startingPoint.dailyPercent,
    recommendedDailyPercent:primary.firstAction.dailyPercent,phases:result.phasePlans,
    assumptions:assumptions.map(event=>({...event,selected:true,hours:event.atHours})),
    following:{...following,available:!!following,selected:assumptions.length>1,
      hours:(Date.parse(assumptions[1]?.at??conservative[1]??following?.pointAt)-Date.parse(result.now))/HOUR},
    plannedResetIndices:primary.trace.events.filter(event=>event.kind==='backup').map(event=>event.resetIndex),
    onObservedReset:'replan-from-actual-account'};
  return phaseResetOpportunities(result,prediction);
}

// Fixed calendar cutoffs depend on the forecast clock, never on usage choices.
function forecastCalendar(base, at, cumulative, horizon = base.normalResetInHours) {
  const points = [];
  const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: base.timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit' });
  const clockFormat = new Intl.DateTimeFormat('en-CA', { timeZone: base.timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    second: '2-digit', hourCycle: 'h23' });
  const [year, month, day] = dayFormat.format(new Date(base.now)).split('-').map(Number);
  for (let offset = 1; offset <= 15; offset++) {
    const target = Date.UTC(year, month - 1, day + offset);
    let instant = target;
    for (let attempt = 0; attempt < 4; attempt++) {
      const p = Object.fromEntries(clockFormat.formatToParts(instant).map(part => [part.type, part.value]));
      const local = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
      const corrected = target - (local - instant);
      if (corrected === instant) break;
      instant = corrected;
    }
    const hour = (instant - Date.parse(base.now)) / HOUR;
    if (hour >= horizon - EPS) break;
    points.push(hour);
  }
  points.push(base.normalResetInHours,horizon);
  return [...new Set(points)].sort((a,b)=>a-b)
    .map(hours => ({ at: at(hours), hours, probability: cumulative(hours) }));
}
