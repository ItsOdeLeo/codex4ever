import test from 'node:test';
import assert from 'node:assert/strict';
import { predictReset,resetProbabilityByHours as probability } from '../src/local-predictor.js';
import { predictionFromArchive } from '../src/reset-forecast.js';
import { resetProbabilityBins } from '../src/reset-probability-plot.js';
import { renderResetForecastSummary } from '../src/reset-forecast-summary.js';

// Suppressed windows keep about 5% of the usual rate: very unlikely, not impossible.
const veryUnlikely=(value,message)=>assert.ok(value>=0&&value<.05,message??`${value} 应很低`);

const history=['2026-10-07T23:00:00Z','2026-10-10T23:00:00Z',
  '2026-10-13T23:00:00Z','2026-10-16T23:00:00Z'];
const args={now:'2026-10-17T12:00:00Z',timeZone:'Europe/Berlin',
  campaignTimeZone:'America/Los_Angeles',resetTimes:history};
const predict=extra=>predictReset({...args,...extra});

test('自动reset之后整个次日再次reset的概率极低，钟点、暗示与明确预告不能绕过',()=>{
  for(const kind of [null,'reset_hint','reset_planned']) {
    const p=predict({posts:kind ? [{createdAt:args.now,text:'Possible reset today.',
      signal:{kind,confidence:1,validUntil:'2026-10-18T10:00:00Z'}}] : []});
    const rule=p.evidence.hardRules.find(rule=>rule.kind==='reset-next-day-cooldown');
    assert.equal(rule.until,'2026-10-18T07:00:00.000Z');
    assert.equal(rule.basis,'user-requested-hard-assumption');
    veryUnlikely(p.todayProbability);
    assert.ok(p.todayProbability>0,'很低但不是不可能');
    for(const hours of [0,.1,5,18.9999,19])veryUnlikely(probability(p,hours));
    assert.ok(probability(p,20)>0,'解除冷却后恢复预测');
    assert.ok(Date.parse(p.nextResetWindow.from)>Date.parse(rule.until));
    assert.ok(Date.parse(p.resetTimeMode.from)>=Date.parse(rule.until));
    const bins=resetProbabilityBins({prediction:p,now:args.now,horizonHours:48}).bins;
    assert.ok(bins.filter(bin=>bin.endHours<=19).every(bin=>bin.probability<.05));
  }
});

test('发布者活动日决定冷却期限，用户时区只影响显示；到期瞬间重新计算后解除',()=>{
  for(const timeZone of ['Europe/Berlin','Asia/Shanghai','America/New_York']) {
    const p=predict({timeZone});
    assert.equal(p.evidence.hardRules[0].until,'2026-10-18T07:00:00.000Z');
    veryUnlikely(probability(p,19));
  }
  const expired=predict({now:'2026-10-18T07:00:00Z'});
  assert.equal(expired.evidence.hardRules.length,0);
  assert.ok(probability(expired,1)>0);
  const prediction=predict();
  const html=renderResetForecastSummary({source:{available:true,prediction},prediction,
    now:new Date(args.now),timeZone:'Europe/Berlin'});
  assert.ok(html.includes('reset 次日冷却期 · 降到平时的 5%'));
  assert.ok(html.includes('截至 10/18 09:00 · 用户设定规则'));
});

test('夏令时让两个活动日长达49小时，48小时预测边界不能提前解除',()=>{
  const resetTimes=[22,25,28,31].map(day=>`2026-10-${day}T07:00:00Z`);
  const p=predict({now:'2026-10-31T07:00:00Z',resetTimes});
  assert.equal(p.evidence.hardRules[0].until,'2026-11-02T08:00:00.000Z');
  assert.equal(p.evidence.hardRules[0].untilHours,49);
  veryUnlikely(p.next48Probability);
  for(const hour of [48,48.5,48.9999,49])veryUnlikely(probability(p,hour));
  assert.ok(probability(p,49.5)>0);
});

test('备用发放不启动或延长冷却，没有已确认reset时不凭空封锁',()=>{
  const now=new Date(args.now);
  const archive={retrievedAt:'2026-10-17',campaignTimeZone:args.campaignTimeZone,
    events:history.map(at=>({at,kind:'automatic'}))};
  const before=predictionFromArchive({archive,now}).prediction;
  const after=predictionFromArchive({archive:{...archive,
    events:[...archive.events,{at:args.now,kind:'banked'}]},now}).prediction;
  assert.deepEqual(before.evidence.hardRules,after.evidence.hardRules);
  const noRecord=predictReset({now:args.now,timeZone:'UTC',priorDailyProbability:.1});
  assert.equal(noRecord.evidence.hardRules.length,0);
  assert.ok(noRecord.todayProbability>0);
});

test('实际已确认的新reset仍优先更新历史，再从新事件重新计算冷却',()=>{
  const completed={createdAt:'2026-10-17T11:00:00Z',text:'Reset is done.',
    signal:{kind:'reset_completed',confidence:1}};
  assert.throws(()=>predict({posts:[completed]}),/先更新历史 reset 时间/);
  const updated=predict({resetTimes:[...history,completed.createdAt],posts:[completed]});
  assert.equal(updated.evidence.hardRules[0].lastResetAt,'2026-10-17T11:00:00.000Z');
  assert.equal(updated.evidence.hardRules[0].until,'2026-10-19T07:00:00.000Z');
  veryUnlikely(updated.todayProbability);
});

test('经验约束可在独立预测API中关闭，以便回放反例，不能冒充不可更改的官方规则',()=>{
  const assumed=predict(),unconstrained=predict({enforceResetCooldown:false});
  veryUnlikely(assumed.todayProbability);
  assert.ok(unconstrained.todayProbability>assumed.todayProbability*10,'关闭约束后恢复常规概率');
  assert.equal(unconstrained.evidence.hardRules.length,0);
  assert.throws(()=>predict({enforceResetCooldown:'false'}),/必须是布尔值/);
});
