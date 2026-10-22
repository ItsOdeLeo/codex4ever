import test from 'node:test';
import assert from 'node:assert/strict';
import { predictReset,resetProbabilityByHours } from '../src/local-predictor.js';
import { renderResetForecastSummary } from '../src/reset-forecast-summary.js';

test('预测卡片并列显示未来 12、24、48 小时的 reset 概率，来自同一累计模型且逐级不减',()=>{
  const now='2026-10-22T10:00:00Z';
  const prediction=predictReset({now,timeZone:'UTC',resetTimes:[6,9,12,15,18,20].map(day=>`2026-10-${String(day).padStart(2,'0')}T05:00:00Z`)});
  assert.equal(prediction.next12Probability,resetProbabilityByHours(prediction,12));
  assert.equal(prediction.next24Probability,resetProbabilityByHours(prediction,24));
  assert.ok(prediction.next12Probability<=prediction.next24Probability);
  assert.ok(prediction.next24Probability<=prediction.next48Probability);
  for(const locale of ['en','zh-CN']) {
    const html=renderResetForecastSummary({source:{available:true,prediction},prediction,now:new Date(now),timeZone:'UTC',locale});
    for(const [hours,key] of [[12,'next12Probability'],[24,'next24Probability'],[48,'next48Probability']])
      assert.match(html,new RegExp(`data-forecast-horizon="${hours}"><small>[^<]+</small><b>${Number((prediction[key]*100).toFixed(1))}%</b>`));
  }
});
