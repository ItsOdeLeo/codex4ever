const HOUR = 3_600_000;

/** Clock-aligned windows for both the forecast's mode and its plotted curve.
 * Never anchor the grid to the request's arbitrary minute/second: that made
 * refreshing at 15:34 manufacture an apparent most-likely time of 07:04.
 * Partial boundary windows use density so their shorter length is explicit. */
export function hourlyResetDistribution({now,probabilityByHours,horizonHours=336,binHours=1}) {
  const origin=new Date(now).getTime();
  if(!Number.isFinite(origin)||!Number.isFinite(horizonHours)||horizonHours<=0
    ||!Number.isFinite(binHours)||binHours<=0)throw new Error('概率绘图时间及分段时长无效');
  const bins=[];
  const stride=binHours*HOUR;
  const firstBoundary=(Math.floor(origin/stride)+1)*stride;
  let before=0;
  for(let startHours=0,index=0;startHours<horizonHours;index++) {
    const endHours=Math.min(horizonHours,(firstBoundary-origin)/HOUR+index*binHours),after=probabilityByHours(endHours);
    if(!Number.isFinite(after)||after<before-1e-10||after<0||after>1)return null;
    const probability=Math.max(0,after-before);
    bins.push({startHours,endHours,probability,densityPerHour:probability/(endHours-startHours),
      startAt:new Date(Math.round(origin+startHours*HOUR)).toISOString(),
      endAt:new Date(Math.round(origin+endHours*HOUR)).toISOString(),cumulativeProbability:after});
    before=after;
    startHours=endHours;
  }
  const peak=bins.reduce((best,bin)=>!best||bin.densityPerHour>best.densityPerHour+1e-12 ? bin : best,null);
  const pointHours=(peak.startHours+peak.endHours)/2;
  const mode=peak.probability>1e-12 ? {method:'maximum-hour-window-density',
    pointAt:new Date(Math.round(origin+pointHours*HOUR)).toISOString(),pointHours,
    from:peak.startAt,to:peak.endAt,fromHours:peak.startHours,toHours:peak.endHours,
    nearbyHours:peak.endHours-peak.startHours,probability:peak.probability,
    earlierProbability:probabilityByHours(peak.startHours),laterProbability:1-peak.cumulativeProbability,
    cumulativeProbability:probabilityByHours(pointHours),searchHours:horizonHours} : null;
  return {bins,horizonHours,binHours,tailProbability:1-before,mode,
    maxDensityPerHour:Math.max(0,...bins.map(bin=>bin.densityPerHour)),basis:'first-future-reset-cdf-differences'};
}

/** Mode of the first future reset, binned by local calendar day. Its tails
 * include all earlier/later outcomes, including beyond the search horizon.
 * No symmetry assumption and no invented minute-level event timestamp. */
export function resetTimingDistribution({ now, timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
  probabilityByHours, searchDays = 14 }) {
  const start = new Date(now).getTime();
  if (!Number.isFinite(start) || !Number.isInteger(searchDays) || searchDays < 1 || searchDays > 31)
    throw new Error('重置分布需要有效时间及1–31天搜索范围');
  const localDay = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const days = [];
  let from = start, before = 0;
  for (let index = 0; index < searchDays; index++) {
    const date = localDay.format(from);
    let lo = from, hi = from + 27 * HOUR;
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      if (localDay.format(mid) === date) lo = mid; else hi = mid;
    }
    const fromHours = (from - start) / HOUR, toHours = (hi - start) / HOUR;
    const after = probabilityByHours(toHours);
    if (!Number.isFinite(after) || after < before - 1e-10 || after < 0 || after > 1) return null;
    days.push({ date, from: new Date(from).toISOString(), to: new Date(hi).toISOString(),
      fromHours, toHours, probability: Math.max(0, after - before),
      earlierProbability: before, laterProbability: 1 - after });
    from = hi; before = after;
  }
  const peak = days.reduce((best, day) => !best || day.probability > best.probability + 1e-12 ? day : best, null);
  // A completely blocked horizon has no most-likely day to report.
  const mostLikely = peak.probability > 1e-12 ? { ...peak,
    anchorHours: (peak.fromHours + peak.toHours) / 2,
    anchorAt: new Date(Math.round((Date.parse(peak.from) + Date.parse(peak.to)) / 2)).toISOString() } : null;
  return { basis: 'first-future-reset-local-calendar-day', timeZone, searchDays, days, mostLikely };
}
