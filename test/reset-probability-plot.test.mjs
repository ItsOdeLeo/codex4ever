import test from 'node:test';
import assert from 'node:assert/strict';
import { resetProbabilityBins, layoutResetProbabilityPlot, layoutResetProbabilityPeaks } from '../src/reset-probability-plot.js';
import { predictReset, resetProbabilityByHours } from '../src/local-predictor.js';
import { planUsagePath } from '../src/usage-path-planner.js';
import { layoutStrategyTree, renderStrategyTree } from '../src/strategy-tree-layout.js';

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
const now = new Date('2026-10-16T08:00:00Z'), timeZone = 'Asia/Shanghai';
const prediction = predictReset({ now: now.toISOString(), timeZone, campaignTimeZone: 'America/Los_Angeles',
  resetTimes: [6, 9, 12, 15].map(day => `2026-10-${String(day).padStart(2, '0')}T05:00:00Z`) });
const input = { weeklyRemaining: 40, weeklyResetDays: 4, weeklyResetHours: 0, resetDates: ['2026-10-17'] };
const plan = extra => planUsagePath({ input, now, timeZone, prediction,
  ...extra });

test('省略两端接近0%或100%的累计标注，保留主要累计值且不改变曲线',()=>{
  const values=[0,.0005,.004,.01,.5,.99,.996,1];
  const bins=values.flatMap((value,day)=>[0,1,2].map(index=>({
    startHours:day*24+index,endHours:day*24+index+1,
    startAt:new Date(+now+(day*24+index)*3600000).toISOString(),
    endAt:new Date(+now+(day*24+index+1)*3600000).toISOString(),
    x:100+day*200+index*10,y:index===1 ? 50 : 100,
    densityPerHour:index===1 ? 1 : 0,cumulativeProbability:value
  })));
  const plot={bins,maxDensityPerHour:1,startX:0,endX:1800};
  const before=structuredClone(plot);
  const peaks=layoutResetProbabilityPeaks({plot,timeZone:'UTC',
    cumulativeAtHours:hours=>values[Math.floor(hours/24)]});
  assert.deepEqual(peaks.map(peak=>peak.cumulativeProbability),[.01,.5,.99]);
  assert.deepEqual(plot,before,'隐藏标签不能截断或归一化底层概率');
});

test('图的每小时概率来自原CDF之差，面积预算及图外尾部守恒，不重拟合正态曲线', () => {
  const distribution = resetProbabilityBins({ prediction, now, horizonHours: 100.5 });
  for (const bin of distribution.bins) {
    near(bin.probability, resetProbabilityByHours(prediction, bin.endHours)
      - resetProbabilityByHours(prediction, bin.startHours));
    near(bin.densityPerHour * (bin.endHours - bin.startHours), bin.probability);
  }
  near(distribution.bins.reduce((sum, bin) => sum + bin.probability, 0) + distribution.tailProbability, 1);
  assert.equal(distribution.bins.at(-1).endHours, 100.5);
  assert.ok(distribution.tailProbability > 0, '显示范围不能被当成100%必然reset');
  const masses = distribution.bins.map(bin => bin.densityPerHour);
  const peaks = masses.filter((mass, index) => index && index < masses.length - 1
    && mass > masses[index - 1] && mass > masses[index + 1]);
  assert.ok(peaks.length > 1, '实际多峰形状不能被强行变成单个钟形');
});

test('曲线、累计概率、预计钟点和额度共用当地日期轴，单位和累计值不混用', () => {
  const result = plan({ heldResetIndices: [0] });
  const graph = layoutStrategyTree(result, { prediction });
  const plot = graph.probabilityPlot, focus = graph.forecastFocus;
  assert.ok(plot && focus);
  const peak=plot.bins.reduce((best,bin)=>bin.densityPerHour>best.densityPerHour ? bin : best);
  const action=graph.nodes.find(node=>node.type==='forecast-assumption'&&node.sequence===1);
  near(focus.x,action.anchorX);
  assert.ok(focus.x>=peak.x-1e-6,'规划时刻不早于曲线最高峰');
  near(peak.y,plot.topY);
  near(focus.cumulativeProbability, resetProbabilityByHours(prediction, focus.pointHours));
  for (const bin of plot.bins) {
    assert.ok(bin.y >= plot.topY - 1e-8 && bin.y <= plot.bottomY);
    assert.ok(bin.x1 >= graph.dayAxis.nowX && bin.x2 <= graph.width);
  }
  near(plot.bins[0].x1, graph.funnel.bands[0].x1);
  const sameTime = plot.bins.find(bin => bin.startHours === 48);
  const depletionBand = graph.funnel.bands.find(band => band.endAt === '2026-10-18T08:00:00.000Z');
  near(sameTime.x1, depletionBand.x2);
  assert.equal(graph.forecastLayout.length,0,'不再单独排列日累计值');
  assert.ok(graph.forecastPeaks.length>=1,'规划时刻之后的主要波峰直接显示累计值');
  assert.ok(graph.forecastPeaks.every(point=>point.x>focus.x),'竖线之前的小累计值不再标注');
  for (const point of graph.forecastPeaks) {
    near(point.cumulativeProbability, resetProbabilityByHours(prediction, point.pointHours));
    const bin=plot.bins.find(bin=>Math.abs(bin.x-point.x)<1e-8);
    near(point.curveY,bin.y);
    assert.ok(Math.abs(point.x-focus.x)>1e-6,'最可能点已有累计值，不重复标注');
  }
  const boxes=[{left:focus.left,width:focus.width,y:focus.y,height:34},...graph.forecastPeaks];
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++) {
    const a=boxes[i],b=boxes[j];
    assert.ok(a.left+a.width<=b.left||b.left+b.width<=a.left||a.y+a.height<=b.y||b.y+b.height<=a.y);
  }
  const html = renderStrategyTree(graph, String);
  assert.match(html, /data-reset-density-plot/);
  assert.match(html, /概率分布/);
  assert.match(html, /累计 [\d.]+%/);
  assert.match(html,/<strong>首次 reset · 规划时刻 \d{2}:\d{2}<small>/);
  assert.match(html,/<small>累计 [\d.]+%<\/small>/);
  assert.doesNotMatch(html,/每小时|\d+小时 [\d.]+%|此段 [\d.]+%/);
  assert.doesNotMatch(html,/class="forecast-calendar forecast-aligned"/);
  assert.match(html,/class="reset-peak-cdf" data-forecast-peak-at=/);
  assert.ok(html.includes(`class="forecast-mode-point" cx="${focus.x}" cy="${plot.topY}"`));
  assert.match(html, /<title>首次 reset · 10\/16 17:00 · 累计/,'鼠标提示按当地时间显示该时刻的累计概率');
  assert.equal(graph.funnel.refills.some(refill => refill.kind === 'extra-reset'), false);
  assert.ok(graph.funnel.bands.some(band => band.kind === 'pause' && band.startHalf === 0 && band.endHalf === 0));
});

test('切换用量或备用不改变分布和累计值，不会将预测重置注入实际余额', () => {
  const held = plan({ heldResetIndices: [0] });
  const used = plan({ requiredResetIndices: [0], paceMultiplier: 1.2 });
  const left = layoutStrategyTree(held, { prediction }), right = layoutStrategyTree(used, { prediction });
  for (const bin of left.probabilityPlot.bins) {
    assert.deepEqual(bin, right.probabilityPlot.bins.find(other => other.startHours === bin.startHours));
  }
  near(left.forecastFocus.x, right.forecastFocus.x);
  near(left.forecastFocus.cumulativeProbability, right.forecastFocus.cumulativeProbability);
  assert.notEqual(held.milestones.points.find(point => point.reasons.includes('depletion')).hours,
    used.milestones.points.find(point => point.reasons.includes('depletion')).hours);
  assert.equal(layoutStrategyTree(plan({ prediction: null }), { prediction: null }).probabilityPlot, null);
  assert.equal(layoutStrategyTree(plan({ prediction: null }), { prediction }).probabilityPlot, null,
    '关闭预测时忽略残留的绘图参数');
});

test('零概率保持平线，低概率保留图外余额，不将曲线归一化成100%；DST日期仍等宽', () => {
  const zero = { todayEndHours: 14, todayProbability: 0, laterGivenNoReset: 0,
    next48Probability: 0, evidence: { dailyFrequency: 0 } };
  const empty = resetProbabilityBins({ prediction: zero, now });
  const geometry = layoutResetProbabilityPlot({ distribution: empty, endHours: 72,
    xAtHours: hour => hour * 2, topY: 20 });
  assert.equal(geometry.tailProbability, 1);
  assert.ok(geometry.bins.every(bin => bin.y === geometry.bottomY));
  const tiny = predictReset({ now: now.toISOString(), timeZone, priorDailyProbability: 1e-9 });
  assert.ok(resetProbabilityBins({ prediction: tiny, now }).tailProbability > .9999);
  const dstNow = new Date('2026-10-24T08:00:00Z');
  const dstPrediction = predictReset({ now: dstNow.toISOString(), timeZone: 'Europe/Berlin', priorDailyProbability: .2 });
  const dst = layoutStrategyTree(plan({ input: { ...input, resetDates: [] }, now: dstNow,
    timeZone: 'Europe/Berlin', prediction: dstPrediction }), { prediction: dstPrediction });
  const day = dst.dayAxis.days.find(day => day.endHours - day.startHours === 25);
  assert.ok(day);
  const hours = dst.probabilityPlot.bins.filter(bin => bin.startHours >= day.startHours && bin.endHours <= day.endHours);
  assert.equal(hours.length, 25);
  near(hours.at(-1).x2 - hours[0].x1, dst.dayAxis.dayWidth);
});
