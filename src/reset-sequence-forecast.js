import { resetReleaseAnchor, releaseClockProbability } from './reset-release-clock.js';
import { resetCooldownRule, SUPPRESSED_HAZARD_FACTOR } from './reset-day-evidence.js';
import { intervalSurvival, renewIntervalDistribution } from './reset-interval-model.js';
import { hourlyResetDistribution } from './reset-timing-distribution.js';

const HOUR=3600000,DAY=24*HOUR;
const caches=new WeakMap();

function renewalModel(prediction,now,resetAt=null) {
  if(!prediction)return null;
  const origin=new Date(now).getTime();
  const firstAt=resetAt??prediction.resetTimeMode?.pointAt??prediction.resetTimeEstimate?.pointAt;
  const first=Date.parse(firstAt),mean=prediction.evidence?.intervalModel?.meanIntervalDays;
  if(!Number.isFinite(first)||first<origin||!Number.isFinite(mean)||mean<=0)return null;
  const sourceClock=prediction.releaseClock;
  const enforce=prediction.enforceResetCooldown??prediction.model==='local-recent-intervals-v5';
  const learned=prediction.evidence?.intervalDistribution;
  if(!caches.has(prediction))caches.set(prediction,new Map());
  const models=caches.get(prediction),key=`${origin}:${first}`;
  const cached=models.get(key);
  if(cached?.origin===origin&&cached.firstAt===firstAt&&cached.mean===mean
    &&cached.sourceClock===sourceClock&&cached.enforce===enforce&&cached.learned===learned)return cached;
  const cooldown=enforce
    ? resetCooldownRule({lastReset:first,now:first,timeZone:sourceClock?.timeZone??prediction.timeZone??'UTC'}) : null;
  const blockedHours=cooldown?.untilHours??0;
  const renewed=renewIntervalDistribution(learned,first);
  const survival=age=>renewed ? intervalSurvival(renewed,age) : Math.exp(-age/mean);
  // Inside the cooldown the renewal rate is scaled down, not removed.
  const factor=prediction.suppressedHazardFactor??SUPPRESSED_HAZARD_FACTOR;
  const initialSurvival=survival(blockedHours/24);
  const suppressed=initialSurvival**factor;
  const baseline=hours=>hours<=blockedHours ? 1-survival(hours/24)**factor : initialSurvival>0
    ? Math.max(0,Math.min(1,1-suppressed*survival(hours/24)/initialSurvival))
    : 1-suppressed*Math.exp(-(hours-blockedHours)/24/mean);
  // Fresh renewal clock: existing hints describe the first reset, so they
  // must not boost a hypothetical second reset after that event has occurred.
  const renewal={model:'local-recent-intervals-v5',
    releaseClock:sourceClock?.quarterHourWeights?.length===96 ? {...sourceClock,originAt:firstAt} : null,
    forecastWindows:[],evidence:{hardRules:cooldown ? [cooldown] : [],intervalDistribution:renewed}};
  const probability=hours=>hours<=(first-origin)/HOUR ? 0 : renewal.releaseClock
    ? releaseClockProbability(renewal,hours-(first-origin)/HOUR,baseline)
    : baseline(hours-(first-origin)/HOUR);
  const result={origin,first,firstAt,mean,sourceClock,enforce,learned,cooldown,probability};
  models.set(key,result);
  return result;
}

/** P(T2 <= now+h | T1=first reference), distinct from the first-reset CDF.
 * `firstAt` defaults to the most likely first-reset time; the plan passes the
 * time it actually assumes, so the curve and the plan share one condition. */
export function followingResetProbabilityByHours(prediction,now,hours,firstAt=null) {
  if(!Number.isFinite(hours)||hours<0)return null;
  return renewalModel(prediction,now,firstAt)?.probability(hours)??null;
}

/** Renew after any selected extra reset, including a second event when
 * estimating a possible third. Bank redemption must never call this as a
 * new automatic reset: it does not change the publisher's event process. */
export function renewedResetProbabilityByHours(prediction,now,resetAt,hours) {
  if(!Number.isFinite(hours)||hours<0)return null;
  return renewalModel(prediction,now,resetAt)?.probability(hours)??null;
}

export function followingResetDistribution({prediction,now,firstAt=null}) {
  const model=renewalModel(prediction,now,firstAt);
  if(!model)return null;
  if(!model.distribution)model.distribution=hourlyResetDistribution({now,
    horizonHours:(model.first-model.origin)/HOUR+336,probabilityByHours:model.probability});
  return model.distribution;
}

/** A conditional second-event reference, not another peak of the first-event
 * CDF. Freeze the learned recent mean and release clock; do not invent a new
 * observed reset or multiply first-event probabilities. */
export function followingResetEstimate({prediction,now,firstAt:assumedAt=null}) {
  const firstAt=assumedAt??prediction?.resetTimeMode?.pointAt??prediction?.resetTimeEstimate?.pointAt;
  const first=Date.parse(firstAt),origin=new Date(now).getTime();
  const mean=prediction?.evidence?.intervalModel?.meanIntervalDays;
  if(!Number.isFinite(first)||!Number.isFinite(origin)||first<=origin||!Number.isFinite(mean)||mean<=0)return null;
  const clock=prediction.releaseClock;
  const enforce=prediction.enforceResetCooldown??prediction.model==='local-recent-intervals-v5';
  const cooldown=enforce ? resetCooldownRule({lastReset:first,now:first,
    timeZone:clock?.timeZone??prediction.timeZone??prediction.displayTimeZone??'UTC'}) : null;
  const notBefore=Math.max(first+1,cooldown ? Date.parse(cooldown.until) : first+1);
  const base=first+mean*DAY;
  const aligned=resetReleaseAnchor({lastReset:first,meanIntervalDays:mean,now:first,notBefore,clock});
  const reference=aligned?.point??Math.max(base,notBefore);
  const mode=followingResetDistribution({prediction,now,firstAt})?.mode;
  if(!mode)return null;
  const point=Date.parse(mode.pointAt);
  return {sequence:2,conditional:true,conditionalOn:firstAt,
    ...mode,
    pointAt:new Date(Math.round(point)).toISOString(),pointHours:(point-origin)/HOUR,
    baseAt:new Date(Math.round(base)).toISOString(),meanIntervalDays:mean,
    gapHours:(point-first)/HOUR,meanReferenceAt:new Date(Math.round(reference)).toISOString(),
    method:'conditional-renewal-hour-window-density',probabilityBasis:'given-first-reset-at-reference',
    releaseTimeZone:clock?.timeZone??null,typicalReleaseTime:clock?.typicalTime??null,
    notBefore:new Date(Math.round(notBefore)).toISOString(),
    basis:'renewal-interval-and-release-clock-given-first-reset; not an unconditional second-event probability'};
}
