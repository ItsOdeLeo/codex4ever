import { translator,uiLocale } from './ui-language.js';

const round=value=>Number(value.toFixed(2));

/** Explain existing forecast inputs and the v5 equation; never fit or replan.
 * Folded by default so the timeline stays the page's focus. */
export function renderForecastMethod({source,prediction,result,timeZone,locale='zh-CN'},escape) {
  const t=translator(locale),evidence=source?.prediction??prediction;
  if(!evidence)return '';
  const clock=evidence.releaseClock,interval=evidence.evidence?.intervalModel;
  const date=value=>value&&Number.isFinite(Date.parse(value))
    ? new Intl.DateTimeFormat(uiLocale(locale),{timeZone,month:uiLocale(locale)==='zh-CN' ? 'numeric' : 'short',
      day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value)) : t('暂无记录');
  // The viewer's own clock, plus the publisher's local time; never a zone ID
  // that reads as if every visitor lived there.
  const clockIn=zone=>new Intl.DateTimeFormat(zone===timeZone ? uiLocale(locale) : 'en-US',{timeZone:zone,hour:'2-digit',minute:'2-digit',
    hourCycle:'h23',...(zone===timeZone ? {} : {timeZoneName:'short'})}).format(new Date(clock.typicalTimeAt));
  const posting=clock?.typicalTimeAt ? clockIn(timeZone) : clock?.typicalTime;
  const publisher=clock?.typicalTimeAt&&clock.timeZone&&clock.timeZone!==timeZone ? clockIn(clock.timeZone) : null;
  const count=interval?.sampleCount??interval?.recentIntervalCount??0;
  const scope=interval?.source==='campaign-intervals'
    ? t('基于本次活动 {count} 个完整间隔',{count})
    : interval?.source==='recent-30-day-intervals'
    ? `${t('近 {days} 天',{days:interval.windowDays??30})} · ${count}`
    : t('近30天／历史回退 · {count} 个间隔',{count});
  const row=(label,value,note)=>`<div><dt>${escape(t(label))}</dt><dd>${escape(value)}<small>${escape(note)}</small></dd></div>`;
  const rows=[
    row('发布时间',posting ? publisher ? t('通常本地时间 {time}（Tibo 当地时间 {local}）',{time:posting,local:publisher})
      : t('通常本地时间 {time}',{time:posting}) : t('数据不足'),
      t('基于全部 {count} 个 reset 日',{count:clock?.sampleCount??0})),
    row('reset 间隔',Number.isFinite(interval?.meanIntervalDays) ? t('平均 {days} 天',{days:round(interval.meanIntervalDays)}) : t('数据不足'),scope),
    row('距上次 reset',Number.isFinite(source?.daysSinceReset) ? t('{days} 天前',{days:round(source.daysSinceReset)}) : t('数据不足'),date(source?.lastResetAt))
  ];
  const scenario=result?.forecastScenario;
  const first=scenario?.selected ? date(scenario.at??scenario.pointAt??new Date(Date.parse(result.now)+scenario.hours*3600000).toISOString()) : null;
  const second=scenario?.following?.selected ? date(Number.isFinite(scenario.following.hours)
    ? new Date(Date.parse(result.now)+scenario.following.hours*3600000).toISOString()
    : scenario.following.at??scenario.following.pointAt) : null;
  const assumptions=first ? second ? t('第一次 {first} · 第二次 {second}',{first,second})
    : t('第一次 {first}',{first}) : t('未假设额外 reset');
  const formula=prediction?.model==='local-recent-intervals-v5' ? `<div class="forecast-formula" data-forecast-formula><p>${escape(t('每小时概率 = 基础概率 × 该小时的历史权重 ÷ 当天平均权重'))}</p><code>ΔHᵢ = log[(1 − F₀(tᵢ₋₁)) / (1 − F₀(tᵢ))] × wᵢ / w̄(dayᵢ)</code><code>F(t) = 1 − exp(−Σ ΔHᵢ) · t* = argmax(ΔFᵢ / Δtᵢ)</code><small>${t('F₀：基础累计概率；w：该小时的历史权重；t*：概率最高的那个小时。')}</small></div>` : '';
  return `<section class="forecast-method" data-forecast-method aria-label="${t('预测怎么算')}"><details><summary><h3>${t('预测怎么算')}</h3></summary><dl>${rows.join('')}</dl>${prediction ? `<p>${t('先根据距上次 reset 的时间、历史间隔和 Tibo 的帖子算出基础概率，再按历史上常见的发布时间分到每个小时。')}</p>${formula}<p>${t('最可能时间是概率最高的那个小时，不是在上次 reset 上简单加平均天数。')}</p><p class="forecast-conditional-note">${t('第二条曲线假设第一次 reset 发生在标记的时间，从那时重新计算。')}</p>` : `<p>${t('预测已关闭，历史统计仍保留。')}</p>`}<p class="forecast-assumptions"><strong>${t('当前假设')}:</strong> ${escape(assumptions)}</p><p>${t('每次补满（备用 reset、正常刷新或计入的 reset）都会重新开始 7 天周期。')}</p><small>${t('以上是本地估算，模型未经校准。')}</small></details></section>`;
}
