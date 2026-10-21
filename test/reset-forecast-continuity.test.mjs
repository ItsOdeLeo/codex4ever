import test from 'node:test';
import assert from 'node:assert/strict';
import { predictReset, resetProbabilityByHours } from '../src/local-predictor.js';
import { intervalSurvival } from '../src/reset-interval-model.js';
import { resetProbabilityBins } from '../src/reset-probability-plot.js';
import { planUsagePath } from '../src/usage-path-planner.js';
import { layoutStrategyTree } from '../src/strategy-tree-layout.js';
import { renderResetForecastSummary } from '../src/reset-forecast-summary.js';

// The five sparse recent intervals behind the reported alternating tall/short
// peaks, including a release cluster crossing Pacific midnight.
const resetTimes=['2026-09-26T18:17:54Z','2026-10-02T21:18:48Z','2026-10-07T03:35:09Z',
  '2026-10-11T04:01:09Z','2026-10-13T05:06:06Z','2026-10-15T06:28:13Z'];
const now=new Date('2026-10-16T08:00:00Z'),timeZone='Europe/Berlin';
const predict=(extra={})=>predictReset({now:now.toISOString(),timeZone,
  campaignTimeZone:'America/Los_Angeles',resetTimes,...extra});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);

test('五个稀疏间隔不因整数天分箱产生2/4/6天高、3/5天低的假精度',()=>{
  const p=predict(),distribution=p.evidence.intervalDistribution;
  assert.equal(distribution.intervals.length,5);
  assert.ok(distribution.bandwidthDays>=1);
  const hazards=p.evidence.ageHazards.slice(0,7);
  for(let i=1;i<hazards.length;i++)assert.ok(hazards[i]>hazards[i-1]);
  for(const age of [2,3,4,5,6]) {
    const hazard=(a,b)=>Math.log(intervalSurvival(distribution,a))-Math.log(intervalSurvival(distribution,b));
    const ratio=hazard(age,age+.001)/hazard(age-.001,age);
    assert.ok(ratio>.99&&ratio<1.01,`整数天${age}出现人为风险跳变`);
  }
});

test('没有新证据时午夜和48小时切点不会切掉发布峰，累计概率保持单调',()=>{
  const p=predict(),F=hours=>resetProbabilityByHours(p,hours);
  const hazard=(a,b)=>Math.log1p(-F(a))-Math.log1p(-F(b));
  for(const hour of [23,47,48,71,95]) {
    // Allow the learned clock's 15-minute numerical resolution. The old
    // midnight mass reallocation dropped risk by over 90% in this fixture.
    const ratio=hazard(hour,hour+.05)/hazard(hour-.05,hour);
    assert.ok(ratio>.7&&ratio<1.3,`边界${hour}小时出现拼接突变：${ratio}`);
  }
  const bins=resetProbabilityBins({prediction:p,now});
  near(bins.bins.reduce((sum,bin)=>sum+bin.probability,0)+bins.tailProbability,1);
  // Non-grid-aligned origins used to hide partial-slot integration errors.
  const shifted=predict({now:'2026-10-16T08:08:37Z'});
  let previous=0;
  for(let hour=0;hour<96;hour+=.1133) {
    const probability=resetProbabilityByHours(shifted,hour);
    assert.ok(probability>=previous-1e-10&&probability<=1,`累计值在${hour}小时下降`);
    previous=probability;
  }
});

test('独立预测、页面摘要和主标记取同一最高小时窗口，均值参考不冒充mode',()=>{
  const p=predict(),mode=p.resetTimeMode;
  assert.notEqual(mode.pointAt,p.resetTimeEstimate.pointAt);
  const result=planUsagePath({now,timeZone,prediction:p,input:{weeklyRemaining:40,weeklyResetDays:4,weeklyResetHours:0,resetDates:[]}});
  const graph=layoutStrategyTree(result,{prediction:p});
  const peak=graph.probabilityPlot.bins.reduce((best,bin)=>bin.probability>best.probability ? bin : best);
  // The guide line marks the planned (conservative) time, at or after the peak.
  const action=graph.nodes.find(node=>node.type==='forecast-assumption'&&node.sequence===1);
  near(graph.forecastFocus.x,action.anchorX);
  assert.ok(graph.forecastFocus.x>=peak.x-1e-6);
  near(peak.y,graph.probabilityPlot.topY);
  near(mode.earlierProbability+mode.probability+mode.laterProbability,1);
  const html=renderResetForecastSummary({source:{available:true,prediction:p},prediction:p,now,timeZone});
  assert.ok(html.includes('最可能 reset 时间</dt><dd>10/18 06:30'));
  assert.doesNotMatch(html,/该 [\d.]+ 小时 [\d.]+%/);
  assert.ok(!html.includes('预计 reset 时间点'));
});
