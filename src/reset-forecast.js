import { predictReset, resetProbabilityByHours } from './local-predictor.js';
import { followingResetEstimate } from './reset-sequence-forecast.js';
import { confidentResetTimes } from './reset-policy-search.js';
import { selectResetCampaign } from './reset-campaign.js';

const DAY = 86_400_000;

/** Offline adapter. Keep data freshness separate from the forecast clock. */
export function predictionFromArchive({ archive, now = new Date(), timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone } = {}) {
  const retrieved = Date.parse(`${archive?.retrievedAt}T00:00:00Z`);
  const age = (now.getTime() - retrieved) / DAY;
  if (!Number.isFinite(age) || age < 0 || age > 14)
    return { available: false, reason: '历史数据已过期，暂不预测' };
  const resetTimes = [...new Set((archive.events ?? [])
    .filter(event => ['automatic', 'automatic_and_banked'].includes(event.kind))
    .map(event => event.at).filter(at => Number.isFinite(Date.parse(at)) && Date.parse(at) <= now.getTime()))]
    .sort((a, b) => Date.parse(a) - Date.parse(b));
  if (resetTimes.length < 4) return { available: false, reason: '历史记录不足，暂不预测' };
  // An announced reset whose time has passed has landed even before a public
  // record catches up; the forecast then looks for the reset after it.
  const landed=(archive.posts??[]).filter(post=>post.signal?.kind==='reset_planned'&&post.signal.scheduledFor)
    .map(post=>({at:Date.parse(post.signal.scheduledFor),source:post.sourceUrl}))
    .filter(item=>item.at<=now.getTime()&&item.at>Date.parse(resetTimes.at(-1))+3_600_000&&item.at>now.getTime()-3*DAY)
    .sort((a,b)=>b.at-a.at)[0];
  if(landed)resetTimes.push(new Date(landed.at).toISOString());
  const prediction = predictReset({ now: now.toISOString(), timeZone, resetTimes,
    posts: archive.posts ?? [],campaignTimeZone:archive.campaignTimeZone??'America/Los_Angeles',
    campaign:selectResetCampaign({campaigns:archive.campaigns,now:now.getTime()}) });
  prediction.evidence.dataAsOf = archive.retrievedAt;
  prediction.evidence.liveCoverage = archive.coverage ?? null;
  const mention=archive.latestResetMention;
  const latestResetMention=mention && Number.isFinite(Date.parse(mention.createdAt))
    && Date.parse(mention.createdAt)<=now.getTime()
    && /^https:\/\/(?:x|twitter)\.com\/thsottiaux\/status\/\d+(?:[?#].*)?$/.test(mention.sourceUrl)
    ? mention : null;
  prediction.evidence.latestResetMention = latestResetMention;
  return { available: true, prediction, dataAsOf: archive.retrievedAt,
    checkedAt:archive.checkedAt??null,coverage:archive.coverage??null,
    classification:archive.classification??null,
    classificationError:archive.classificationError??null,
    llmConfigured:archive.llmConfigured??false,
    latestResetMention,
    lastResetSource:landed ? landed.source : archive.lastResetSource??null,
    lastResetAt:landed ? resetTimes.at(-1) : archive.lastResetAt??resetTimes.at(-1),
    daysSinceReset:(now.getTime()-Date.parse(resetTimes.at(-1)))/DAY };
}

/** Marginal probabilities on the selected path: an actual extra reset replans.
 * These are not independent branch odds and must not be multiplied together. */
/** Conservative times for up to two resets (no probability gate), as ISO strings. */
export function conservativeResetTimes(result,prediction) {
  const origin=Date.parse(result.now);
  const normalAt=Date.parse(result.originalNormalResetAt??result.normalResetAt);
  if(!prediction||!Number.isFinite(origin)||!Number.isFinite(normalAt))return [];
  return confidentResetTimes({prediction,now:result.now,normalHours:(normalAt-origin)/3600000,count:2}).times
    .map(hours=>new Date(Math.round(origin+hours*3600000)).toISOString());
}

export function strategyResetForecast(result, prediction) {
  if (!prediction) return { enabled: false, milestones: [] };
  // One rule everywhere: the second curve is conditioned on the first reset at
  // its conservative time, whether or not this strategy counts it.
  const assumedFirstAt=result.recommendation?.primary?.assumedResetTimes?.[0]
    ??conservativeResetTimes(result,prediction)[0]??null;
  const milestones = result.milestones.points.filter(point => point.reasons.includes('depletion')
    || point.reasons.includes('backup')).map(point => {
    const probability = resetProbabilityByHours(prediction, point.hours);
    return { hours: point.hours, at: point.at, probability,
      noResetProbability: 1 - probability,
      kind: point.reasons.includes('backup') ? 'backup' : 'depletion',
      resetIndices: point.events.filter(event => event.kind === 'backup').map(event => event.resetIndex) };
  });
  return { enabled: true, model: prediction.model ?? 'provided-forecast', calibrated: prediction.calibrated === true,
    mostLikely: prediction.resetTimingDistribution?.mostLikely ?? null,
    timeEstimate: prediction.resetTimeEstimate ?? null,
    timeMode: prediction.resetTimeMode ?? null,
    // Condition the second curve on the first reset the plan assumes, if any.
    followingReset:assumedFirstAt
      ? followingResetEstimate({prediction,now:result.now,firstAt:assumedFirstAt})??prediction.followingResetEstimate??null
      : prediction.followingResetEstimate??followingResetEstimate({prediction,now:result.now}),
    modeSearchDays: prediction.resetTimingDistribution?.searchDays ?? null,
    dataAsOf: prediction.evidence?.dataAsOf ?? null, probabilityBasis: 'cumulative-from-plan-start',
    onReset: 'replan-from-observed-balance', milestones };
}

/** Unselected assumption cards for a plan that counts no predicted reset
 * (keep-available, feedback, or no counted reset). They sit at the same
 * conservative times a counted plan would assume; nothing is replanned here. */
export function forecastAssumptionCards(result,prediction) {
  const HOUR=3600000,EPS=1e-7;
  const conservative=conservativeResetTimes(result,prediction);
  const mode=conservative[0] ? {...prediction.resetTimeMode,pointAt:conservative[0]} : prediction?.resetTimeMode;
  const origin=Date.parse(result.now),hours=(Date.parse(mode?.pointAt)-origin)/HOUR;
  if(!result.available||!mode||!Number.isFinite(hours)||hours<=EPS||hours>336)
    return {available:false,selected:false,reason:'暂无可用于假设规划的最可能 reset 时间'};
  const cumulative=hour=>resetProbabilityByHours(prediction,hour)??0;
  const following=result.resetForecast?.followingReset;
  const secondHours=(Date.parse(conservative[1]??following?.pointAt)-origin)/HOUR;
  const first={sequence:1,at:mode.pointAt,hours,probability:mode.probability,cumulativeProbability:cumulative(hours)};
  return {available:true,selected:false,secondSelected:false,conditional:true,at:mode.pointAt,hours,
    probability:mode.probability,cumulativeProbability:first.cumulativeProbability,
    following:{available:Number.isFinite(secondHours)&&secondHours>hours+EPS,selected:false,...following,hours:secondHours},
    assumptions:[{...first,selected:false}],onObservedReset:'replan-from-actual-account'};
}
