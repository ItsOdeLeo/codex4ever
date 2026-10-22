/** Independent reset forecast. No network, DOM, or account access. */
import { resetIntervalModel, intervalSurvival } from './reset-interval-model.js';
import { campaignDay, campaignFeature, resetCooldownRule, SUPPRESSED_HAZARD_FACTOR } from './reset-day-evidence.js';

// Same rate scaled down: survival^factor over the window.
const suppressWith=factor=>probability=>1-(1-probability)**factor;
import { resetTimingDistribution, hourlyResetDistribution } from './reset-timing-distribution.js';
import { fitResetReleaseClock, releaseClockProbability, estimateResetTime } from './reset-release-clock.js';
import { followingResetEstimate } from './reset-sequence-forecast.js';
import { describeResetCampaign } from './reset-campaign.js';
import { completedResetEvent } from './reset-event-time.js';
const DAY_MS = 86_400_000;
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const oddsUpdate = (p, ratio) => {
  if(p<=0 || p>=1)return clamp(p,0,1);
  const odds = p / (1 - p);
  return odds * ratio / (1 + odds * ratio);
};

function dateMs(value, label) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) throw new Error(`${label} 不是有效时间`);
  return time;
}

function hoursToLocalMidnight(nowMs, timeZone) {
  let formatter;
  try { formatter = new Intl.DateTimeFormat('en-CA', { timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit' }); }
  catch { throw new Error('时区无效'); }
  const today = formatter.format(new Date(nowMs));
  let lo = nowMs, hi = nowMs + 27 * 3_600_000;
  if (formatter.format(new Date(hi)) === today) throw new Error('无法确定本地午夜');
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (formatter.format(new Date(mid)) === today) lo = mid;
    else hi = mid;
  }
  return Number(((hi - nowMs) / 3_600_000).toFixed(8));
}

function chanceFromAge(hazards, priorDaily, ageDays, durationDays, distribution=null) {
  if(distribution) {
    const before=intervalSurvival(distribution,ageDays),after=intervalSurvival(distribution,ageDays+durationDays);
    return before>0 ? clamp(1-after/before,0,1) : -Math.expm1(-durationDays/distribution.meanIntervalDays);
  }
  let survival = 1;
  let elapsed = 0;
  while (elapsed < durationDays - 1e-10) {
    const age = ageDays + elapsed;
    const bin = Math.floor(age);
    const span = Math.min(durationDays - elapsed, bin + 1 - age);
    survival *= (1 - (hazards[bin] ?? priorDaily)) ** span;
    elapsed += span;
  }
  return 1 - survival;
}

function postEffects(posts, nowMs, elapsedDays, lastResetMs) {
  let strongestHint = 0, strongestFeature = 0, strongestAnnouncement = 0;
  for (const post of posts) {
    const ageHours = (nowMs - dateMs(post.createdAt, '帖子时间')) / 3_600_000;
    if (ageHours < 0 || ageHours >= 72 || (lastResetMs !== undefined
      && dateMs(post.createdAt, '帖子时间') <= lastResetMs)) continue;
    const signal = post.signal;
    if (!signal || !['reset_hint', 'reset_planned', 'reset_completed', 'banked_credit',
      'new_feature', 'irrelevant', 'unknown'].includes(signal.kind)
      || !Number.isFinite(signal.confidence) || signal.confidence < 0 || signal.confidence > 1) {
      throw new Error('帖子需要有效的 LLM 分类 kind 和 0–1 confidence');
    }
    if (signal.kind === 'reset_planned') {
      const validUntilMs = signal.validUntil === undefined
        ? dateMs(post.createdAt, '帖子时间') + DAY_MS
        : dateMs(signal.validUntil, '预告截止时间');
      if (validUntilMs <= nowMs + elapsedDays * DAY_MS) continue;
    }
    // Older posts and later forecast days carry less evidence. Keep only the
    // strongest signal of each kind, so reposts do not multiply likelihood.
    const strength = signal.confidence * clamp(1 - (ageHours + elapsedDays * 24) / 72, 0, 1);
    if (signal.kind === 'reset_hint') strongestHint = Math.max(strongestHint, strength);
    if (signal.kind === 'new_feature' && !campaignFeature(post)) strongestFeature = Math.max(strongestFeature, strength);
    if (signal.kind === 'reset_planned') strongestAnnouncement = Math.max(strongestAnnouncement, strength);
  }
  return { hint: strongestHint, feature: strongestFeature, announcement: strongestAnnouncement,
    ratio: 3 ** strongestHint * 0.25 ** strongestFeature * 30 ** strongestAnnouncement };
}

/**
 * resetTimes: public automatic-reset event timestamps, oldest first. Exclude
 * banked-only credits. At least four are required unless a prior is supplied.
 * posts: Tibo posts with LLM-provided {kind, confidence} in `signal`.
 * Returns experimental event probabilities, not calibrated account odds.
 */
export function predictReset({ now, timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
  resetTimes = [], posts = [], priorDailyProbability, campaignTimeZone=timeZone, campaign=null, enforceResetCooldown=true,
  suppressedHazardFactor=SUPPRESSED_HAZARD_FACTOR } = {}) {
  const nowMs = dateMs(now, '当前时间');
  if(typeof enforceResetCooldown!=='boolean')throw new Error('enforceResetCooldown 必须是布尔值');
  if(!Number.isFinite(suppressedHazardFactor)||suppressedHazardFactor<0||suppressedHazardFactor>1)
    throw new Error('suppressedHazardFactor 必须在 0–1 之间');
  const suppress=suppressWith(suppressedHazardFactor);
  if (!Array.isArray(resetTimes) || !Array.isArray(posts)) throw new Error('历史 reset 与帖子必须是数组');
  const times = resetTimes.map((value, i) => dateMs(value, `历史 reset ${i + 1}`));
  if (times.some((time, i) => time > nowMs || (i && time <= times[i - 1]))) {
    throw new Error('历史 reset 需要按时间递增，且不能晚于当前时间');
  }
  const intervals = times.slice(1).map((time, i) => (time - times[i]) / DAY_MS);
  if (priorDailyProbability !== undefined && (!Number.isFinite(priorDailyProbability)
    || priorDailyProbability <= 0 || priorDailyProbability >= 1)) {
    throw new Error('手动先验日概率必须在 0–1 之间');
  }
  if (intervals.length < 3 && priorDailyProbability === undefined) {
    throw new Error('至少需要四次已确认 reset，或显式提供手动先验日概率');
  }
  if (posts.some(post => {
    const completion=completedResetEvent(post,nowMs);
    return completion && dateMs(completion.at, '重置发生时间') > (times.at(-1) ?? -Infinity) + 3_600_000;
  })) {
    throw new Error('帖子报告 reset 已完成；先更新历史 reset 时间和当前账户额度，再预测下一次');
  }
  const ageDays = times.length ? (nowMs - times.at(-1)) / DAY_MS : null;
  campaign=describeResetCampaign(campaign,nowMs);
  const campaignActive=campaign?.status==='active';
  const forecastTimeZone=campaign?.timeZone??campaignTimeZone;
  const frequency=resetIntervalModel(intervals.length>=3 ? times : [],nowMs,forecastTimeZone,priorDailyProbability,campaign);
  if(!Number.isFinite(frequency.daily))throw new Error('不同日期的 reset 记录不足，需要补充历史或显式提供先验');
  const todayEndHours = hoursToLocalMidnight(nowMs, forecastTimeZone);
  const firstDays = todayEndHours / 24;
  const secondDays = (48 - todayEndHours) / 24;
  const {daily,hazards,distribution,...intervalSummary} = frequency;
  intervalSummary.smoothing=distribution ? {method:distribution.method,bandwidthDays:distribution.bandwidthDays,
    priorEquivalentIntervals:distribution.priorEquivalentIntervals} : null;
  const currentAge = ageDays ?? 0;
  const localDay = new Intl.DateTimeFormat('en-CA', { timeZone:forecastTimeZone,
    year: 'numeric', month: '2-digit', day: '2-digit' });
  const cooldownRule=enforceResetCooldown
    ? resetCooldownRule({lastReset:times.at(-1),now:nowMs,timeZone:forecastTimeZone}) : null;
  const cooldown=cooldownRule ? {...cooldownRule,hazardFactor:suppressedHazardFactor} : null;
  const feature=posts.filter(post=>campaignFeature(post)
    && dateMs(post.createdAt,'帖子时间')<=nowMs
    && localDay.format(new Date(post.createdAt))===localDay.format(new Date(nowMs)))
    .sort((a,b)=>dateMs(b.createdAt,'帖子时间')-dateMs(a.createdAt,'帖子时间'))[0];
  const blockedToday=!!feature || !!cooldown;
  const rule=feature ? {kind:'campaign-feature-day',day:campaignDay(feature),sourceUrl:feature.sourceUrl??null,
    applied:true,hazardFactor:suppressedHazardFactor,until:new Date(Math.round(nowMs+todayEndHours*3_600_000)).toISOString(),untilHours:todayEndHours,
    basis:'user-requested-hard-assumption',timeZone:forecastTimeZone}
    : null;
  const hardRules=[...(rule ? [rule] : []),...(cooldown ? [cooldown] : [])];
  const todayBase=chanceFromAge(hazards, daily, currentAge, firstDays,distribution);
  const baseline = [blockedToday ? suppress(todayBase) : todayBase,
  chanceFromAge(hazards, daily, currentAge + firstDays, secondDays,distribution)];
  const signals = [postEffects(posts, nowMs, 0, times.at(-1)),
    postEffects(posts, nowMs, firstDays, times.at(-1))];
  // Explicit windows cover 48h and any longer suppressed period, so a
  // cooldown reaching past 48h is scaled down rather than cut off.
  const windowsEnd=Math.max(48,cooldown?.untilHours??0);
  const boundaries=[0,todayEndHours,48,windowsEnd,...(cooldown ? [cooldown.untilHours] : []),...posts.filter(post=>post.signal?.kind==='reset_planned')
    .map(post=>(dateMs(post.signal.validUntil??new Date(dateMs(post.createdAt,'帖子时间')+DAY_MS).toISOString(),'预告截止时间')-nowMs)/3_600_000)
    .filter(hour=>hour>0 && hour<48)].sort((a,b)=>a-b).filter((hour,index,array)=>!index || Math.abs(hour-array[index-1])>1e-7);
  const forecastWindows=boundaries.slice(1).map((endHours,index)=>{
    const startHours=boundaries[index],base=chanceFromAge(hazards,daily,currentAge+startHours/24,(endHours-startHours)/24,distribution);
    const effect=postEffects(posts,nowMs,startHours/24,times.at(-1));
    const blocked=!!feature && startHours<todayEndHours || cooldown && startHours<cooldown.untilHours-1e-8;
    // Post signals cannot lift a suppressed window: it keeps the scaled base rate.
    return {startHours,endHours,baselineProbability:base,probability:blocked ? suppress(base) : oddsUpdate(base,effect.ratio),...(blocked ? {suppressed:true} : {})};
  });
  const prediction={model:'local-recent-intervals-v5',calibrated:false,todayEndHours,enforceResetCooldown,suppressedHazardFactor,
    timeZone:forecastTimeZone,displayTimeZone:timeZone,forecastWindows,
    releaseClock: fitResetReleaseClock({ times, now: nowMs, timeZone: forecastTimeZone }),
    evidence:{daysSinceReset:ageDays,dailyFrequency:daily,ageHazards:hazards,intervalDistribution:distribution,hardRules}};
  const todayProbability = resetProbabilityByHours(prediction,todayEndHours);
  const next48 = resetProbabilityByHours(prediction,48);
  const laterGivenNoReset = (next48-todayProbability)/Math.max(Number.EPSILON,1-todayProbability);
  const laterProbability = (1 - todayProbability) * laterGivenNoReset;
  const next48Probability = todayProbability + laterProbability;
  Object.assign(prediction,{
    horizonHours: 48,
    // Shorter horizons for planning the next hours (same cumulative model).
    next12Probability:resetProbabilityByHours(prediction,12),
    next24Probability:resetProbabilityByHours(prediction,24),
    todayProbability, laterGivenNoReset, next48Probability,
    todayEndHours,
    events: [{ inHours: todayEndHours, probability: todayProbability },
      { inHours: 48, probability: laterProbability }],
    evidence: { observedIntervals: intervals.length, daysSinceReset: ageDays,
      baselineDaily: baseline, signalEffects: signals,
      recentEventDays: frequency.recentEventDays,
      recentCoverageDays: frequency.recentCoverageDays,
      dailyFrequency: daily,
      ageHazards: hazards,
      intervalDistribution: distribution,
      source:frequency.source,intervalModel:intervalSummary,hardRules,campaignActive,campaign }
  });
  const quantile=probability=>{
    let lo=0,hi=24;
    while(resetProbabilityByHours(prediction,hi)<probability && hi<8760)hi=Math.min(8760,hi*2);
    if(resetProbabilityByHours(prediction,hi)<probability)return null;
    for(let i=0;i<45;i++) {const mid=(lo+hi)/2;if(resetProbabilityByHours(prediction,mid)<probability)lo=mid;else hi=mid;}
    return new Date(Math.round(nowMs+hi*3_600_000)).toISOString();
  };
  prediction.nextResetWindow={coverage:.8,from:quantile(.1),medianAt:quantile(.5),to:quantile(.9),
    basis:'conditional-model-prediction; not a guarantee or confidence interval for the mean'};
  prediction.resetTimingDistribution = resetTimingDistribution({ now: nowMs, timeZone,
    probabilityByHours: hours => resetProbabilityByHours(prediction, hours) });
  prediction.resetTimeEstimate = estimateResetTime({ lastReset: times.at(-1), meanIntervalDays: intervalSummary.meanIntervalDays,
    now: nowMs, notBefore: Math.max(nowMs, ...prediction.evidence.hardRules.filter(rule => rule.applied && rule.hazardFactor < 1)
      .map(rule => Date.parse(rule.until))), clock: prediction.releaseClock,
    probabilityByHours: hours => resetProbabilityByHours(prediction, hours) });
  prediction.resetTimeMode=hourlyResetDistribution({now:nowMs,
    probabilityByHours:hours=>resetProbabilityByHours(prediction,hours)}).mode;
  prediction.followingResetEstimate=followingResetEstimate({prediction,now:nowMs});
  return prediction;
}

/** Cumulative chance by a particular hour. Beyond 48h, use age-conditioned history. */
export function resetProbabilityByHours(prediction, hours) {
  if (!prediction || !Number.isFinite(hours) || hours < 0) return null;
  if (hours === 0) return 0;
  if (['local-recent-intervals-v4','local-recent-intervals-v5'].includes(prediction.model) && prediction.releaseClock)
    return releaseClockProbability(prediction, hours, value => baseResetProbabilityByHours(prediction, value));
  return baseResetProbabilityByHours(prediction, hours);
}

function baseResetProbabilityByHours(prediction, hours) {
  if (hours === 0) return 0;
  if(['local-recent-intervals-v4','local-recent-intervals-v5'].includes(prediction.model)) {
    const {ageHazards:hazards,dailyFrequency:daily,daysSinceReset:age,intervalDistribution:distribution}=prediction.evidence;
    let survival=1;
    for(const window of prediction.forecastWindows) {
      if(hours<=window.startHours)break;
      const duration=(Math.min(hours,window.endHours)-window.startHours)/24;
      const partial=chanceFromAge(hazards,daily,(age??0)+window.startHours/24,duration,distribution);
      const hazard=-Math.log1p(-window.baselineProbability);
      const fraction=Number.isFinite(hazard) && hazard>0 ? -Math.log1p(-partial)/hazard
        : duration*24/(window.endHours-window.startHours);
      survival*=(1-window.probability)**fraction;
    }
    // Older saved forecasts may still carry zero-probability rules.
    const futureStart=Math.max(48,prediction.forecastWindows.at(-1)?.endHours??0,...(prediction.evidence.hardRules??[])
      .filter(rule=>rule.applied&&rule.probability===0).map(rule=>rule.untilHours??0));
    if(hours>futureStart)survival*=1-chanceFromAge(hazards,daily,(age??0)+futureStart/24,(hours-futureStart)/24,distribution);
    return clamp(1-survival,0,1);
  }
  const first = prediction.todayEndHours;
  const pToday = prediction.todayProbability;
  const pLater = prediction.laterGivenNoReset;
  if (![first, pToday, pLater].every(Number.isFinite) || first <= 0 || first >= 48) return null;
  const segmentChance = (p, fraction) => 1 - (1 - p) ** fraction;
  if (hours <= first) return segmentChance(pToday, hours / first);
  const survivingToday = 1 - pToday;
  if (hours <= 48) return 1 - survivingToday
    * (1 - segmentChance(pLater, (hours - first) / (48 - first)));
  const daily = prediction.evidence?.dailyFrequency;
  if (!Number.isFinite(daily) || daily < 0 || daily > 1) return null;
  const futureChance = chanceFromAge(prediction.evidence?.ageHazards ?? [], daily,
    (prediction.evidence?.daysSinceReset ?? 0) + 2, (hours - 48) / 24);
  return 1 - (1 - prediction.next48Probability) * (1 - futureChance);
}
