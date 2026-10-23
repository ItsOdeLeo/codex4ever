const DAY = 86_400_000, HOUR = 3_600_000, SLOT = 15 * 60_000;
const caches = new WeakMap();
const hazardCaches = new WeakMap();

// UTC offsets belong to the zone, not to a fitted clock: one table per zone,
// shared by every scenario's clock.
const zones = new Map();
function zoneCache(timeZone) {
  if (!zones.has(timeZone)) zones.set(timeZone, { offsets: new Map(), formatter: new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }) });
  return zones.get(timeZone);
}
function clockCache(clock) {
  if (!caches.has(clock)) caches.set(clock, { days: new Map() });
  return caches.get(clock);
}
// Local wall-clock fields. formatToParts is slow (seconds per plan on a
// phone) and the planner asks thousands of times, but a zone's UTC offset
// only changes at transitions, which always fall on a quarter hour. So ask
// once per quarter-hour slot and add the offset; the fields are identical.
function offsetAt(stamp, clock) {
  const cache = zoneCache(clock.timeZone), slot = Math.floor(stamp / SLOT);
  let offset = cache.offsets.get(slot);
  if (offset === undefined) {
    const p = Object.fromEntries(cache.formatter.formatToParts(slot * SLOT).map(part => [part.type, Number(part.value)]));
    offset = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - slot * SLOT;
    cache.offsets.set(slot, offset);
  }
  return offset;
}
// Hot paths need only the local day and the local quarter hour: arithmetic
// on the shifted stamp, no Date objects.
const localDay = (stamp, clock) => Math.floor((stamp + offsetAt(stamp, clock)) / DAY);
const localQuarter = (stamp, clock) => Math.floor((((stamp + offsetAt(stamp, clock)) % DAY + DAY) % DAY) / SLOT);
const parts = (stamp, clock) => {
  const local = new Date(stamp + offsetAt(stamp, clock));
  return { year: local.getUTCFullYear(), month: local.getUTCMonth() + 1, day: local.getUTCDate(),
    hour: local.getUTCHours(), minute: local.getUTCMinutes(), second: local.getUTCSeconds() };
};

function zonedStamp(target, clock) {
  let stamp = target;
  for (let i = 0; i < 4; i++) {
    const p = parts(stamp, clock);
    const corrected = target - (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - stamp);
    if (corrected === stamp) break;
    stamp = corrected;
  }
  return stamp;
}

function clockDay(stamp, clock) {
  const key = localDay(stamp, clock);
  const cache = clockCache(clock).days;
  if (!cache.has(key)) {
    const start = zonedStamp(key * DAY, clock);
    const end = zonedStamp((key + 1) * DAY, clock);
    const weights = [], prefix = [0];
    for (let time = start; time < end; time += SLOT) {
      const weight = clock.quarterHourWeights[localQuarter(time + SLOT / 2, clock)];
      weights.push(weight);
      prefix.push(prefix.at(-1) + weight * Math.min(SLOT, end - time));
    }
    cache.set(key, { start, end, weights, prefix });
  }
  return cache.get(key);
}

function logBesselI0(kappa) {
  let term=1,sum=1;
  for(let n=1;n<200;n++) {
    term*=kappa*kappa/(4*n*n);sum+=term;
    if(term<sum*1e-14)break;
  }
  return Math.log(sum);
}

/** All recorded automatic-reset days have equal weight. Circular von Mises
 * KDE avoids treating 23:00 and 01:00 as noon. Select concentration by
 * leave-one-out likelihood, instead of letting five recent samples dictate
 * multiple sharp peaks. The grid is a numerical search, not a fitted certainty. */
export function fitResetReleaseClock({ times, now, timeZone }) {
  const dateFormat = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  times = [...new Map(times.filter(time => time <= now).sort((a, b) => a - b)
    .map(time => [dateFormat.format(time), time])).values()];
  if (times.length < 3) return null;
  const clock = { timeZone, originAt: new Date(now).toISOString(), windowDays:null, sampleCount:times.length,
    fromAt:new Date(times[0]).toISOString(),throughAt:new Date(times.at(-1)).toISOString(),
    historyDays:(now-times[0])/DAY,sampleScope:'all-history',sampleUnit:'automatic-reset-day',
    sampleWeighting:'equal',gridMinutes:15,method:'equal-weight-von-mises-kde',
    bandwidthSelection:'leave-one-out-log-likelihood',concentrationSearch:{min:0,max:64,candidates:22},
    uniformMixture:.001 };
  const samples = times.map(time => {
    const p = parts(time, clock);
    return (p.hour*60+p.minute+p.second/60)*2*Math.PI/1440;
  });
  const cosines=samples.map(angle=>samples.map(other=>Math.cos(angle-other)));
  const candidates=[0,...Array.from({length:21},(_,index)=>2**(-4+index/2))];
  const scores=candidates.map(kappa=>cosines.reduce((score,row,index)=>score+Math.log(
    row.reduce((sum,cosine,j)=>sum+(j===index ? 0 : Math.exp(kappa*(cosine-1))),0)/(samples.length-1))
    +kappa-logBesselI0(kappa),0));
  clock.concentration=candidates[scores.indexOf(Math.max(...scores))];
  clock.bandwidthMinutes=clock.concentration>0 ? 1440/(2*Math.PI*Math.sqrt(clock.concentration)) : 720;
  const normalizer=clock.concentration-logBesselI0(clock.concentration);
  const density = minute => clock.uniformMixture+(1-clock.uniformMixture)*samples.reduce((sum,angle)=>sum+Math.exp(clock.concentration
    *(Math.cos(minute*2*Math.PI/1440-angle)-1)+normalizer),0)/samples.length;
  const peaks = Array.from({ length: 96 }, (_, index) => density(index * 15));
  clock.typicalMinuteOfDay = peaks.indexOf(Math.max(...peaks)) * 15;
  clock.typicalTime = `${String(Math.floor(clock.typicalMinuteOfDay / 60)).padStart(2, '0')}:${String(clock.typicalMinuteOfDay % 60).padStart(2, '0')}`;
  const current=parts(now,clock);
  clock.typicalTimeAt=new Date(zonedStamp(Date.UTC(current.year,current.month-1,current.day,
    Math.floor(clock.typicalMinuteOfDay/60),clock.typicalMinuteOfDay%60),clock)).toISOString();
  clock.quarterHourWeights = Array.from({ length: 96 }, (_, index) => density(index * 15 + 7.5));
  return clock;
}

/** v5 integrates continuous weighted risk. Serialized v4 forecasts retain
 * their original per-window probability allocation for compatibility. */
export function releaseClockProbability(prediction, hours, baseProbability) {
  if(prediction.model==='local-recent-intervals-v5')
    return continuousClockProbability(prediction,hours,baseProbability);
  const clock = prediction.releaseClock, origin = Date.parse(clock.originAt), stamp = origin + hours * HOUR;
  const day = clockDay(stamp, clock);
  let from = Math.max(0, (day.start - origin) / HOUR), to = (day.end - origin) / HOUR;
  for (const window of prediction.forecastWindows) for (const boundary of [window.startHours, window.endHours]) {
    if (Math.abs(boundary - hours) < 1e-8) return baseProbability(hours);
    if (boundary < hours) from = Math.max(from, boundary); else to = Math.min(to, boundary);
  }
  if (hours <= from + 1e-8 || hours >= to - 1e-8) return baseProbability(hours);
  const integral = time => {
    const position = (time - day.start) / SLOT, slot = Math.min(day.weights.length - 1, Math.floor(position));
    if (time >= day.end) return day.prefix.at(-1);
    return day.prefix[slot] + (position - slot) * SLOT * day.weights[slot];
  };
  const start = integral(origin + from * HOUR), total = integral(origin + to * HOUR) - start;
  const fraction = (integral(stamp) - start) / total;
  const before = baseProbability(from), after = baseProbability(to);
  return Math.max(0, Math.min(1, before + (after - before) * fraction));
}

/** Integrate the release-clock-weighted hazard continuously. Reallocating a
 * fixed mass within each calendar day made late-night clusters jump abruptly
 * at midnight (and at an arbitrary 48h cutoff). Here only evidence changes can
 * change risk abruptly; the clock itself is continuous across midnight.
 * Quarter-hour integration is cached per immutable prediction object. */
function continuousClockProbability(prediction,hours,baseProbability) {
  const clock=prediction.releaseClock,origin=Date.parse(clock.originAt),stepHours=SLOT/HOUR;
  if(!hazardCaches.has(prediction))hazardCaches.set(prediction,{prefix:[0]});
  const {prefix}=hazardCaches.get(prediction);
  const increment=(from,to)=>{
    // Split at genuine evidence boundaries, so a blocked period never leaks
    // risk from the other side of a partial integration slot.
    const cuts=[from,...[...prediction.forecastWindows.flatMap(window=>[window.startHours,window.endHours]),
      ...(prediction.evidence.hardRules??[]).map(rule=>rule.untilHours).filter(Number.isFinite),
      ...[prediction.evidence.intervalDistribution?.regime?.endsAt]
        .filter(Boolean).map(at=>(Date.parse(at)-origin)/HOUR)]
      .filter(boundary=>boundary>from&&boundary<to),to].sort((a,b)=>a-b);
    for(let stamp=(Math.floor((origin+from*HOUR)/SLOT)+1)*SLOT;stamp<origin+to*HOUR;stamp+=SLOT)
      cuts.push((stamp-origin)/HOUR);
    cuts.sort((a,b)=>a-b);
    let hazard=0;
    for(let index=1;index<cuts.length;index++) {
      const a=cuts[index-1],b=cuts[index];
      const before=baseProbability(a),after=baseProbability(b);
      if(before>=1)return 0;
      if(after>=1)return Infinity;
      const step=Math.max(0,Math.log1p(-before)-Math.log1p(-after));
      // An announced reset time already says when: no release-clock reshaping.
      if(prediction.forecastWindows.some(window=>window.scheduled&&window.startHours<=a&&b<=window.endHours+1e-8)) {
        hazard+=step;continue;
      }
      const stamp=origin+(a+b)/2*HOUR,day=clockDay(stamp,clock);
      const weight=clock.quarterHourWeights[localQuarter(stamp,clock)];
      const mean=day.prefix.at(-1)/(day.end-day.start);
      hazard+=step*weight/mean;
    }
    return hazard;
  };
  const slot=Math.floor(hours/stepHours);
  while(prefix.length<=slot) {
    const index=prefix.length-1;
    prefix.push(prefix[index]+increment(index*stepHours,(index+1)*stepHours));
  }
  const hazard=prefix[slot]+(hours>slot*stepHours ? increment(slot*stepHours,hours) : 0);
  return -Math.expm1(-hazard);
}

/** User's planning anchor: last reset + recent mean interval, snapped to the
 * nearest future typical release time. This is an estimate, not a point mass. */
export function resetReleaseAnchor({ lastReset, meanIntervalDays, now, notBefore = now, clock }) {
  if (!clock || !Number.isFinite(lastReset) || !Number.isFinite(meanIntervalDays)) return null;
  const base = lastReset + meanIntervalDays * DAY;
  const target = Math.max(base, now, notBefore), p = parts(target, clock);
  const candidates = [-1, 0, 1, 2].map(offset => zonedStamp(Date.UTC(p.year, p.month - 1, p.day + offset,
    Math.floor(clock.typicalMinuteOfDay / 60), clock.typicalMinuteOfDay % 60), clock))
    .filter(stamp => stamp > now && stamp >= notBefore);
  const point = candidates.reduce((best, stamp) => Math.abs(stamp - target) < Math.abs(best - target) ? stamp : best);
  return {point,base};
}

export function estimateResetTime({ lastReset, meanIntervalDays, now, notBefore = now, clock, probabilityByHours }) {
  const anchor=resetReleaseAnchor({lastReset,meanIntervalDays,now,notBefore,clock});
  if(!anchor)return null;
  const {point,base}=anchor;
  const pointHours = (point - now) / HOUR;
  const fromHours = Math.max(0, pointHours - clock.bandwidthMinutes / 60), toHours = pointHours + clock.bandwidthMinutes / 60;
  const earlier = probabilityByHours(fromHours), after = probabilityByHours(toHours);
  return { method: 'last-reset-plus-recent-mean-aligned-to-release-clock', pointAt: new Date(point).toISOString(),
    pointHours, baseAt: new Date(Math.round(base)).toISOString(), meanAlreadyPassed: base <= now,
    from: new Date(Math.round(now + fromHours * HOUR)).toISOString(),
    to: new Date(Math.round(now + toHours * HOUR)).toISOString(), fromHours, toHours,
    nearbyHours: (toHours - fromHours), probability: Math.max(0, after - earlier),
    earlierProbability: earlier, laterProbability: 1 - after,
    releaseTimeZone: clock.timeZone, typicalReleaseTime: clock.typicalTime,
    clockSampleCount: clock.sampleCount, clockWindowDays: clock.windowDays,clockSampleScope:clock.sampleScope };
}
