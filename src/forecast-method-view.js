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
  const posting=clock?.typicalTimeAt ? new Intl.DateTimeFormat(uiLocale(locale),{timeZone,
    hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(clock.typicalTimeAt)) : clock?.typicalTime;
  const count=interval?.sampleCount??interval?.recentIntervalCount??0;
  const scope=interval?.source==='campaign-intervals'
    ? t('当前活动 · {count} 个完整间隔',{count})
    : interval?.source==='recent-30-day-intervals'
    ? `${t('近 {days} 天',{days:interval.windowDays??30})} · ${count}`
    : t('近30天／历史回退 · {count} 个间隔',{count});
  const row=(label,value,note)=>`<div><dt>${escape(t(label))}</dt><dd>${escape(value)}<small>${escape(note)}</small></dd></div>`;
  const rows=[
    row('发布钟点',posting ? t('常见 {time} · {zone}',{time:posting,zone:timeZone}) : t('数据不足'),
      t('全部历史 · {count} 个重置日',{count:clock?.sampleCount??0})),
    row('重置间隔',Number.isFinite(interval?.meanIntervalDays) ? t('平均 {days} 天',{days:round(interval.meanIntervalDays)}) : t('数据不足'),scope),
    row('距上次重置',Number.isFinite(source?.daysSinceReset) ? t('{days} 天前',{days:round(source.daysSinceReset)}) : t('数据不足'),date(source?.lastResetAt))
  ];
  const scenario=result?.forecastScenario;
  const first=scenario?.selected ? date(scenario.at??scenario.pointAt??new Date(Date.parse(result.now)+scenario.hours*3600000).toISOString()) : null;
  const second=scenario?.following?.selected ? date(scenario.following.at??scenario.following.pointAt
    ??new Date(Date.parse(result.now)+scenario.following.hours*3600000).toISOString()) : null;
  const assumptions=first ? second ? t('首次 {first} · 第二次 {second}',{first,second})
    : t('首次 {first}',{first}) : t('未假设额外重置');
  const formula=prediction?.model==='local-recent-intervals-v5' ? `<div class="forecast-formula" data-forecast-formula><p>${escape(t('时段风险 = 基础风险 × 历史钟点权重 ÷ 当日平均权重'))}</p><code>ΔHᵢ = log[(1 − F₀(tᵢ₋₁)) / (1 − F₀(tᵢ))] × wᵢ / w̄(dayᵢ)</code><code>F(t) = 1 − exp(−Σ ΔHᵢ) · t* = argmax(ΔFᵢ / Δtᵢ)</code><small>${t('F₀：基础累计概率；w：全历史钟点权重；t*：最可能的小时窗口。')}</small></div>` : '';
  return `<section class="forecast-method" data-forecast-method aria-label="${t('预测怎么算')}"><details><summary><h3>${t('预测怎么算')}</h3></summary><dl>${rows.join('')}</dl><p>${t('发布钟点使用全部历史自动重置日；重置间隔优先使用当前活动内的完整间隔，样本不足时回退到近期或历史。')}</p>${prediction ? `<p>${t('基础风险结合距上次重置的时间、所选间隔分布、帖子信号和冷却规则，再用历史发布钟点加权。')}</p>${formula}<p>${t('累计概率由加权风险累积得到；最可能时间取实际分布中概率密度最高的小时窗口，不是简单把平均天数加到上次时间。')}</p><p class="forecast-conditional-note">${t('第二条曲线以首次在标记时间发生为前提，从该点重新计时；其累计值也以这个前提为条件。')}</p>` : `<p>${t('预测已关闭，历史统计仍保留。')}</p>`}<p class="forecast-assumptions"><strong>${t('当前假设')}:</strong> ${escape(assumptions)}</p><p>${t('计划中的备用、正常和假设重置都从该时刻重新开始7天周期；只有选中的假设才会补满预测额度。')}</p><small>${t('本地估计，模型尚未校准。')}</small></details></section>`;
}
