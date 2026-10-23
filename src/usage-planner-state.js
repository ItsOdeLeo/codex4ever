import { planUsagePath } from './usage-path-planner.js';
import { DEFAULT_RECOMMENDATION_MODE } from './recommended-usage-path.js';
import { paceChoices } from './usage-pace-steps.js';
import { strategyTimeRange } from './strategy-time-range.js';
import { validUsageStrategy } from './usage-strategy.js';
import { validAvailabilityMode } from './availability-goal.js';

const validMultiplier=value=>paceChoices.some(choice=>choice.multiplier===value);
const intent=value=>Object.freeze({...value,
  heldResetIndices:Object.freeze([...value.heldResetIndices]),
  requiredResetIndices:Object.freeze([...value.requiredResetIndices])});
const state=value=>Object.freeze({...value,intent:intent(value.intent)});

/** One planning state. Form drafts, language and window sizes are UI state;
 * they cannot select a solver or modify the last calculated snapshot.
 */
export function createUsagePlannerState({timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone,
  targetMultiplier=1,forecastEnabled=true,usageStrategy='balanced',availabilityMode='optimistic',alertsEnabled=false}={}) {
  return state({timeZone,snapshot:null,observedDailyPercent:null,result:null,displayEndHours:null,
    intent:{usageStrategy:validUsageStrategy(usageStrategy) ? usageStrategy : 'balanced',
      availabilityMode:validAvailabilityMode(availabilityMode) ? availabilityMode : 'optimistic',
      alertsEnabled:alertsEnabled===true,
      targetMultiplier:validMultiplier(targetMultiplier) ? targetMultiplier : 1,
      forecastEnabled:typeof forecastEnabled==='boolean' ? forecastEnabled : true,
      // resetCountOverride: null follows the confidence rule; 0–2 is the user's choice.
      assumedResetCount:0,resetCountOverride:null,heldResetIndices:[],requiredResetIndices:[]}});
}

export function activePlannerPrediction(planner) {
  return planner.intent.forecastEnabled ? planner.snapshot?.prediction??null : null;
}

/** The only adapter from application intent to the core planner, which has
 * exactly one algorithm. Controls never construct planner options.
 */
export function usagePlannerInput(planner) {
  if(!planner.snapshot)return null;
  const {snapshot,intent,timeZone}=planner;
  return {...(snapshot.usageSnapshot ? {usageSnapshot:snapshot.usageSnapshot} : {input:snapshot.input}),
    now:new Date(snapshot.now),timeZone,
    recommendationMode:snapshot.recommendationMode??DEFAULT_RECOMMENDATION_MODE,
    prediction:activePlannerPrediction(planner),averagePercentPerDay:planner.observedDailyPercent,
    usageStrategy:intent.usageStrategy,availabilityMode:intent.availabilityMode,alertsEnabled:intent.alertsEnabled,
    paceMultiplier:intent.targetMultiplier,
    heldResetIndices:intent.heldResetIndices,requiredResetIndices:intent.requiredResetIndices,
    assumedResetCount:intent.resetCountOverride??'auto'};
}

/** The safe daily budget if no extra reset ever comes: the same planner with
 * the forecast off, using the quota up exactly by the next refill. */
export function noExtraResetBudget(planner) {
  const input=usagePlannerInput(planner);
  if(!input)return null;
  const result=planUsagePath({...input,prediction:null,usageStrategy:'maximize',
    heldResetIndices:[],requiredResetIndices:[],assumedResetCount:0});
  const daily=result.available ? result.phasePlans?.[0]?.dailyPercent : null;
  return Number.isFinite(daily) ? daily : null;
}

function calculate(planner,newSnapshot) {
  const result=planUsagePath(usagePlannerInput(planner));
  const assumedResetCount=result.forecastScenario?.selected
    ? result.forecastScenario.secondSelected ? 2 : 1 : 0;
  return state({...planner,result,
    observedDailyPercent:result.available ? result.averagePercentPerDay : planner.observedDailyPercent,
    displayEndHours:newSnapshot&&result.available
      ? strategyTimeRange(result,{prediction:planner.snapshot.prediction}) : planner.displayEndHours,
    intent:{...planner.intent,assumedResetCount}});
}

/** Pure action -> intent -> calculation -> resolved state. Strategy,
 * assumptions, banks and forecast have explicit actions, with dependency
 * rules implemented here once for every control.
 * The function has no DOM, storage, network or account-operation effects.
 */
export function updateUsagePlanner(planner,action) {
  const previous=planner.intent;
  let next;
  if(action.type==='invalidate')return state({...planner,result:null,displayEndHours:null});
  if(action.type==='import-mcp-plan') {
    const session=structuredClone(action.session),result=session.result,options=session.planning??{};
    // The account's own refresh, not the plan's refresh after assumed resets.
    const refreshHours=()=>Math.max(0,(Date.parse(session.usageSnapshot?.weekly?.resetAt??result.originalNormalResetAt??result.normalResetAt)
      -Date.parse(result.now))/3600000);
    const input=session.input??{weeklyRemaining:session.usageSnapshot.weekly.remainingPercent,
      weeklyResetDays:Math.floor(refreshHours()/24),
      weeklyResetHours:Math.floor(refreshHours()%24),resetDates:result.resets?.map(reset=>reset.expiresOn)??[]};
    const snapshot=Object.freeze({input:Object.freeze(input),usageSnapshot:session.usageSnapshot,
      now:result.now,prediction:session.prediction,recommendationMode:options.recommendationMode??DEFAULT_RECOMMENDATION_MODE});
    return state({...planner,timeZone:session.timeZone,snapshot,result,
      observedDailyPercent:result.averagePercentPerDay??null,
      displayEndHours:result.available ? strategyTimeRange(result,{prediction:session.prediction}) : null,
      intent:{...previous,usageStrategy:options.usageStrategy??'balanced',forecastEnabled:!!session.prediction,
        availabilityMode:options.availabilityMode??'optimistic',alertsEnabled:options.alertsEnabled===true,
        targetMultiplier:options.paceMultiplier??1,
        heldResetIndices:options.heldResetIndices??[],requiredResetIndices:options.requiredResetIndices??[],
        assumedResetCount:result.forecastScenario?.secondSelected ? 2 : result.forecastScenario?.selected ? 1 : 0}});
  }
  if(action.type==='new-snapshot') {
    const input=structuredClone(action.input);
    if(Array.isArray(input.resetDates))Object.freeze(input.resetDates);
    const snapshot=Object.freeze({input:Object.freeze(input),now:new Date(action.now).toISOString(),
      prediction:action.prediction ? structuredClone(action.prediction) : null});
    next={...planner,snapshot,result:null,displayEndHours:null,
      observedDailyPercent:input.weeklyRemaining===100 ? planner.observedDailyPercent : null,
      intent:{...previous,assumedResetCount:0,resetCountOverride:null,heldResetIndices:[],requiredResetIndices:[]}};
    return calculate(next,true);
  }
  if(!planner.result)return planner;
  if(action.type==='set-strategy') {
    if(!validUsageStrategy(action.strategy))return planner;
    next={...previous,usageStrategy:action.strategy};
  } else if(action.type==='set-availability-mode') {
    if(!validAvailabilityMode(action.mode))return planner;
    next={...previous,availabilityMode:action.mode};
  } else if(action.type==='toggle-alerts') {
    // Notification preferences do not rerun or alter the resource policy.
    const enabled=!previous.alertsEnabled,availability=planner.result.recommendation?.availability;
    return state({...planner,intent:{...previous,alertsEnabled:enabled},
      result:availability ? {...planner.result,recommendation:{...planner.result.recommendation,
        availability:{...availability,notification:{...availability.notification,enabled,
          shouldNotify:enabled&&availability.status!=='on-track'}}}} : planner.result});
  } else if(action.type==='toggle-forecast') {
    const forecastEnabled=!previous.forecastEnabled;
    next={...previous,forecastEnabled,
      assumedResetCount:forecastEnabled ? previous.assumedResetCount : 0};
  } else if(action.type==='toggle-assumption') {
    const sequence=Number(action.sequence??1);
    if(![1,2].includes(sequence))return planner;
    const count=previous.assumedResetCount;
    // Choosing how many resets to count is an input of the one algorithm.
    const chosen=sequence===2 ? count===2 ? 1 : 2 : count ? 0 : 1;
    // In keep available, counting a reset is its optimistic mode and counting
    // none is cautious; the strategy itself stays.
    next={...previous,
      ...(previous.usageStrategy==='keep-available' ? {availabilityMode:chosen ? 'optimistic' : 'cautious'} : {}),
      assumedResetCount:chosen,resetCountOverride:chosen};
  } else if(action.type==='toggle-bank') {
    const index=Number(action.index),choice=planner.result.backupChoices?.find(choice=>choice.index===index);
    if(!choice||choice.actionable===false)return planner;
    next={...previous,
      heldResetIndices:choice.used ? [...new Set([...previous.heldResetIndices,index])]
        : previous.heldResetIndices.filter(item=>item!==index),
      requiredResetIndices:choice.used ? previous.requiredResetIndices.filter(item=>item!==index)
        : [...new Set([...previous.requiredResetIndices,index])]};
  } else return planner;
  return calculate({...planner,intent:next},false);
}
