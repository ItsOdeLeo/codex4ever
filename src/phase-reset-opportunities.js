import { resetProbabilityByHours } from './local-predictor.js';
import { renewedResetProbabilityByHours } from './reset-sequence-forecast.js';

const HOUR=3600000,EPS=1e-7;

/** Conditional chance of another public reset before this phase's next
 * replenishment/expiry boundary. Derives explanation data, not a new refill
 * or a hidden change to the user's selected consumption. */
export function phaseResetOpportunities(result,prediction) {
  if(!result.available||!prediction||!result.phasePlans)return result;
  const points=result.milestones.points,events=points.flatMap(point=>point.events);
  const extra=events.filter(event=>event.kind==='assumed-extra-reset');
  const banks=events.filter(event=>event.kind==='backup');
  const at=hours=>new Date(Math.round(Date.parse(result.now)+hours*HOUR)).toISOString();
  const phasePlans=result.phasePlans.map(phase=>{
    const start=phase.startHours;
    const state=points.find(point=>Math.abs(point.hours-start)<EPS)?.stateAfter;
    if((state?.quota??phase.quotaBefore??0)<=EPS)return phase;
    const supply=points.find(point=>point.hours>start+EPS&&point.reasons.some(reason=>
      ['backup','normal-refresh','assumed-extra-reset'].includes(reason)));
    const boundaries=[...(result.usageStrategy==='keep-available' ? [{hours:phase.endHours,kind:'availability-review'}] : []),
      ...(supply ? [{hours:supply.hours,kind:supply.reasons.includes('backup') ? 'backup'
      : supply.reasons.includes('assumed-extra-reset') ? 'assumed-extra-reset' : 'normal-refresh'}] : []),
      ...(result.normalResetInHours>start+EPS ? [{hours:result.normalResetInHours,kind:'normal-refresh'}] : []),
      ...result.resets.filter((reset,index)=>reset.expiresInHours>start+EPS
        &&!banks.some(event=>event.resetIndex===index&&event.atHours<=start+EPS))
        .map(reset=>({hours:reset.expiresInHours-1>start+EPS ? reset.expiresInHours-1 : reset.expiresInHours,kind:'backup-expiry'}))]
      .filter(boundary=>boundary.hours>start+EPS).sort((a,b)=>a.hours-b.hours);
    const boundary=boundaries[0]??{hours:phase.endHours,kind:'phase-end'};
    if(boundary.hours<=start+EPS)return phase;
    const previous=extra.filter(event=>event.atHours<=start+EPS).at(-1);
    const cdf=hours=>previous
      ? renewedResetProbabilityByHours(prediction,result.now,previous.at,hours)
      : resetProbabilityByHours(prediction,hours);
    const before=cdf(start),after=cdf(boundary.hours);
    if(!Number.isFinite(before)||!Number.isFinite(after)||before>=1-EPS)return phase;
    const probability=Math.max(0,Math.min(1,(after-before)/(1-before)));
    return {...phase,nextResetOpportunity:{startAt:at(start),until:at(boundary.hours),
      startHours:start,untilHours:boundary.hours,boundaryKind:boundary.kind,probability,
      previousExtraResetAt:previous?.at??null,nextExtraResetSequence:previous ? (previous.sequence??1)+1 : 1,
      conditional:true,basis:'no-additional-public-reset-before-phase-start',
      renewalBasis:previous ? 'selected-extra-reset' : 'current-public-reset-forecast'}};
  });
  // A future automatic redemption is a contingency on this no-further-reset
  // path, not a commitment to spend inventory regardless of new public resets.
  // User-required redemptions and expiry-driven use retain their own meaning.
  const backupChoices=result.backupChoices?.map(choice=>{
    if(!choice.used||choice.required||choice.reason!=='quota-exhausted')return choice;
    const previous=extra.filter(event=>event.atHours<=choice.atHours+EPS).at(-1);
    const cdf=previous
      ? renewedResetProbabilityByHours(prediction,result.now,previous.at,choice.atHours)
      : resetProbabilityByHours(prediction,choice.atHours);
    return {...choice,usageCondition:{kind:'no-further-reset-and-quota-exhausted',
      since:previous?.at??result.now,until:choice.at,
      probability:Number.isFinite(cdf) ? Math.max(0,Math.min(1,1-cdf)) : null,
      previousExtraResetAt:previous?.at??null,nextExtraResetSequence:previous ? (previous.sequence??1)+1 : 1}};
  });
  return {...result,phasePlans,backupChoices,forecastScenario:result.forecastScenario?.selected
    ? {...result.forecastScenario,phases:phasePlans} : result.forecastScenario};
}
