import test from 'node:test';
import assert from 'node:assert/strict';
import { predictReset,resetProbabilityByHours } from '../src/local-predictor.js';
import { renderForecastMethod } from '../src/forecast-method-view.js';

test('页面所示加权风险公式与v5实际CDF一致，钟点全历史和间隔样本分别展示',()=>{
  const now='2026-10-16T00:00:00Z';
  const prediction=predictReset({now,timeZone:'UTC',enforceResetCooldown:false,
    resetTimes:[3,6,9,12,15].map(day=>`2026-10-${String(day).padStart(2,'0')}T18:00:00Z`)});
  const base={...prediction,releaseClock:null};
  const weights=prediction.releaseClock.quarterHourWeights;
  const mean=weights.reduce((sum,value)=>sum+value,0)/weights.length;
  let hazard=0;
  for(let index=0;index<96;index++) {
    const before=resetProbabilityByHours(base,index/4),after=resetProbabilityByHours(base,(index+1)/4);
    hazard+=Math.log((1-before)/(1-after))*weights[index]/mean;
  }
  assert.ok(Math.abs((1-Math.exp(-hazard))-resetProbabilityByHours(prediction,24))<1e-10);
  const before=structuredClone(prediction);
  const source={prediction,lastResetAt:'2026-10-15T18:00:00Z',daysSinceReset:.25};
  for(const locale of ['en','zh-CN']) {
    const html=renderForecastMethod({source,prediction,timeZone:'UTC',locale},String);
    assert.match(html,/data-forecast-formula/);
    assert.match(html,/ΔHᵢ = log\[/);
    assert.match(html,/t\* = argmax\(ΔFᵢ \/ Δtᵢ\)/);
    // Folded by default; the heading stays visible as the summary.
    assert.match(html,/<details><summary><h3>/);
    assert.doesNotMatch(html,/<details open| hidden/);
    if(locale==='en') {
      assert.match(html,/All history · 5 reset days/);
      assert.match(html,/Last 30 days · 4/);
      assert.match(html,/highest-density hourly window/);
      assert.doesNotMatch(html,/\p{Script=Han}/u);
    }
  }
  const viewer=renderForecastMethod({source,prediction,timeZone:'Europe/Berlin',locale:'en'},String);
  assert.match(viewer,/Typically \d{2}:\d{2} your time/);
  assert.doesNotMatch(viewer,/Europe\/Berlin/,'访问者时区不以 ID 形式出现');
  assert.deepEqual(prediction,before,'解释只读取模型，不改概率或重新拟合');
});
