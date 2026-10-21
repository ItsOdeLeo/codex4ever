import { resetProbabilityByHours } from './local-predictor.js';
import { hourlyResetDistribution } from './reset-timing-distribution.js';

const coordinate = value => Number(value.toFixed(4));

/** Sample the existing first-reset CDF. Bin mass is F(b)-F(a), never a
 * Gaussian fitted around the planning reference or normalized to the view. */
export function resetProbabilityBins({ prediction, now, horizonHours = 336, binHours = 1 }) {
  if (!prediction) return null;
  return hourlyResetDistribution({now,horizonHours,binHours,
    probabilityByHours:hours=>resetProbabilityByHours(prediction,hours)});
}

/** Geometry only. Keep raw masses/CDF for tooltips; the curve connects the
 * hourly density samples without imposing symmetry or adding quota refills. */
export function layoutResetProbabilityPlot({ distribution, endHours, xAtHours, topY, height = 76 }) {
  if (!distribution) return null;
  const visible = distribution.bins.filter(bin => bin.endHours <= endHours + 1e-8);
  if (!visible.length) return null;
  const max = distribution.maxDensityPerHour;
  const bottomY = topY + height;
  const bins = visible.map(bin => ({ ...bin, x1: xAtHours(bin.startHours), x2: xAtHours(bin.endHours),
    x: xAtHours((bin.startHours + bin.endHours) / 2),
    y: bottomY - (max > 0 ? bin.densityPerHour / max * height : 0) }));
  const first = bins[0], last = bins.at(-1);
  const line = `M ${coordinate(first.x1)} ${coordinate(first.y)} `
    + bins.map(bin => `L ${coordinate(bin.x)} ${coordinate(bin.y)}`).join(' ')
    + ` L ${coordinate(last.x2)} ${coordinate(last.y)}`;
  return { bins, topY, height, bottomY, startX: first.x1, endX: last.x2,
    endHours: last.endHours, endAt: last.endAt, maxDensityPerHour: max,
    cumulativeProbability: last.cumulativeProbability, tailProbability: 1 - last.cumulativeProbability,
    densityPath: line, areaPath: `${line} L ${coordinate(last.x2)} ${bottomY} L ${coordinate(first.x1)} ${bottomY} Z`,
    basis: distribution.basis };
}

/** Attach a few CDF values to actual curve peaks. Pick the main peak per
 * viewer-local day, then omit labels that would collide with the mode or each
 * other. Hide CDF labels below 1% or above 99% in the tails. Selection affects
 * annotations only, never the underlying forecast. */
export function layoutResetProbabilityPeaks({plot,timeZone,focus=null,otherLabels=[],cumulativeAtHours}) {
  if(!plot||!plot.maxDensityPerHour)return [];
  const day=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'});
  const byDay=new Map();
  for(let index=1;index<plot.bins.length-1;index++) {
    const bin=plot.bins[index];
    if(bin.densityPerHour<=plot.bins[index-1].densityPerHour
      ||bin.densityPerHour<plot.bins[index+1].densityPerHour
      ||bin.densityPerHour<plot.maxDensityPerHour*.2)continue;
    const key=day.format(new Date((Date.parse(bin.startAt)+Date.parse(bin.endAt))/2));
    if(!byDay.has(key)||bin.densityPerHour>byDay.get(key).densityPerHour)byDay.set(key,bin);
  }
  const occupied=[...(focus ? [{left:focus.left,width:focus.width,y:focus.y,height:34}] : []),...otherLabels];
  const peaks=[];
  for(const bin of [...byDay.values()].sort((a,b)=>b.densityPerHour-a.densityPerHour)) {
    if(focus&&Math.abs(bin.x-focus.x)<1e-6)continue; // Mode already includes CDF.
    const pointHours=(bin.startHours+bin.endHours)/2;
    const cumulativeProbability=cumulativeAtHours(pointHours);
    if(cumulativeProbability<.01||cumulativeProbability>.99)continue;
    const width=84,height=16;
    const box={left:Math.max(plot.startX,Math.min(plot.endX-width,bin.x-width/2)),
      y:bin.y-24,width,height};
    if(occupied.some(other=>box.left<other.left+other.width+8&&box.left+width+8>other.left
      &&box.y<other.y+other.height+6&&box.y+height+6>other.y))continue;
    occupied.push(box);
    peaks.push({...box,x:bin.x,curveY:bin.y,pointHours,
      at:new Date(Math.round((Date.parse(bin.startAt)+Date.parse(bin.endAt))/2)).toISOString(),
      cumulativeProbability});
  }
  return peaks.sort((a,b)=>a.pointHours-b.pointHours);
}
