import { translator,uiLocale,diagnosticText } from './ui-language.js';
const escape = value => String(value).replace(/[&<>"']/g, character =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const number = value => Number.isFinite(value) ? Number(value.toFixed(2)) : null;
const postLabels = { reset_planned: '明确预告', reset_completed: '已重置记录', reset_hint: '可能暗示',
  banked_credit: '备用 reset', new_feature: '新功能', irrelevant: '无重置信号', unknown: '暂未识别' };
const postUrl = value => /^https:\/\/(?:x|twitter)\.com\/thsottiaux\/status\/\d+(?:[?#].*)?$/.test(value ?? '');

/** Present existing model outputs; never derive a new probability or quota. */
export function renderResetForecastSummary({ source, prediction = null,
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone, now = new Date(),locale='zh-CN' } = {}) {
  const t=translator(locale);
  if (!source?.available) return `<p class="forecast-summary-unavailable" data-forecast-summary>${escape(diagnosticText(locale,source?.reason??'预测数据暂不可用'))}</p>`;
  const dateFormat = new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit',
    day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const parts = value => Object.fromEntries(dateFormat.formatToParts(new Date(value)).map(part => [part.type, part.value]));
  const year = parts(now).year;
  const format = value => {
    if (!value || !Number.isFinite(Date.parse(value))) return null;
    const p = parts(value);
    return uiLocale(locale)==='zh-CN' ? `${p.year===year ? '' : p.year+'/'}${p.month}/${p.day} ${p.hour}:${p.minute}`
      : new Intl.DateTimeFormat(uiLocale(locale),{timeZone,month:'short',day:'numeric',...(p.year===year ? {} : {year:'numeric'}),hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value));
  };
  const row = (key, label, value, note = '') => `<div data-forecast-stat="${key}"><dt>${escape(t(label))}</dt><dd>${value}${note ? `<small>${escape(note)}</small>` : ''}</dd></div>`;
  const model = source.prediction?.evidence?.intervalModel;
  const campaign = source.prediction?.evidence?.campaign;
  const mean = number(model?.meanIntervalDays);
  const confidence = model?.meanIntervalConfidence;
  const low = number(confidence?.lowDays), high = number(confidence?.highDays);
  const level = Number.isFinite(confidence?.level) ? Math.round(confidence.level * 100) : 95;
  const recent = model?.source === 'recent-30-day-intervals';
  const campaignFit = model?.source === 'campaign-intervals';
  const count = model?.sampleCount ?? (recent ? model.recentIntervalCount : model?.intervals?.length);
  const scope = campaignFit ? t('本次 campaign · {count} 次 reset',{count:model.campaignEventCount})
    : recent ? t('近 {days} 天',{days:model.windowDays}) : model?.source === 'non-campaign-historical-intervals' ? t('非活动历史回退') : t('历史回退');
  const fallback = model?.selectionReason === 'campaign-has-no-complete-interval' ? t(' · 活动样本不足，暂回退') : '';
  const sample = mean === null ? '' : `${scope}${Number.isInteger(count) ? t(' · {count} 个完整间隔',{count}) : ''}${fallback}`;
  const last = format(source.lastResetAt);
  const lastValue = last && postUrl(source.lastResetSource)
    ? `<a href="${escape(source.lastResetSource)}" target="_blank" rel="noopener noreferrer">${escape(last)}</a>`
    : escape(last??t('暂无记录'));
  const age = number(source.daysSinceReset);
  const rows = [
    row('last-reset', '上次公开 reset', lastValue, age === null ? '' : t('{days} 天前',{days:age})),
    row('mean-interval', '平均 reset 间隔', mean===null ? t('数据不足') : t('{days} 天',{days:mean}), sample),
    row('mean-confidence', t('均值 {level}% 置信区间',{level}), low===null||high===null ? t('样本不足，暂不估计') : t('{low} – {high} 天',{low,high}))
  ];
  if (campaign) {
    const status = { active:'进行中',upcoming:'尚未开始',ended:'已结束' }[campaign.status];
    const start = format(campaign.startsAt), end = format(campaign.endsAt);
    const value = postUrl(campaign.sourceUrl)
      ? `<a href="${escape(campaign.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escape(t(campaign.name))}</a>`
      : escape(t(campaign.name));
    rows.splice(1,0,row('campaign','特殊 campaign',`${value} · ${escape(t(status))}`,
      t('{start} 起 · {end} 结束（按 Day 1 和活动天数推算）',{start,end})));
  }
  const clock = source.prediction?.releaseClock;
  if (clock?.sampleScope === 'all-history') {
    const localClock = clock.typicalTimeAt ? parts(clock.typicalTimeAt) : null;
    rows.push(row('release-clock','常见发布钟点',escape(localClock ? `${localClock.hour}:${localClock.minute}` : clock.typicalTime),
      localClock&&clock.timeZone&&clock.timeZone!==timeZone
        ? t('全部历史 · {count} 个 reset 日 · 你的时间；Tibo 当地 {local}',{count:clock.sampleCount,
          local:new Intl.DateTimeFormat('en-US',{timeZone:clock.timeZone,hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZoneName:'short'}).format(new Date(clock.typicalTimeAt))})
        : t('全部历史 · {count} 个 reset 日 · 你的时间',{count:clock.sampleCount})));
  }
  if (prediction) {
    const estimate = prediction.resetTimeEstimate,mode = prediction.resetTimeMode;
    const window = prediction.nextResetWindow;
    const from = format(window?.from), to = format(window?.to);
    const coverage = Number.isFinite(window?.coverage) ? Math.round(window.coverage * 100) : 80;
    rows.push(mode ? row('next-reset-mode','最可能 reset 时间',escape(format(mode.pointAt)))
      : estimate ? row('next-reset-estimate', '平均间隔参考时间', escape(format(estimate.pointAt)),
      t('{scope} {count} 次 · 常见 {time}（{zone}）',{scope:estimate.clockSampleScope==='all-history' ? t('全部历史') : t('近 {days} 天',{days:estimate.clockWindowDays}),count:estimate.clockSampleCount,time:estimate.typicalReleaseTime,zone:estimate.releaseTimeZone}))
      : row('next-reset-median', '下次预计（中位）', escape(format(window?.medianAt)??t('暂无法估计'))),
      row('next-reset-window', t('下次 {coverage}% 预测窗口',{coverage}), from && to ? `${escape(from)} – ${escape(to)}` : t('暂无法估计')));
    for (const rule of prediction.evidence?.hardRules ?? []) {
      const until = format(rule.until);
      if (!rule.applied || !until || Date.parse(rule.until) <= now.getTime()) continue;
      const label = rule.kind === 'campaign-feature-day' ? t('Day {day} 功能帖',{day:rule.day})
        : rule.kind === 'reset-next-day-cooldown' ? t('reset 次日冷却期') : t('活动日内已 reset');
      const strength=Number.isFinite(rule.probability) ? `${rule.probability * 100}%`
        : t('降到平时的 {percent}%',{percent:Math.round(rule.hazardFactor*100)});
      rows.push(row('active-rule', '当前预测约束', `${escape(t(label))} · ${escape(strength)}`,
        t('截至 {time}{rule}',{time:until,rule:rule.basis==='user-requested-hard-assumption' ? t(' · 用户设定规则') : ''})));
    }
  } else rows.push(row('prediction-disabled', '下次 reset 预测',t('已关闭')));
  const mention = source.latestPost??source.latestResetMention;
  if (mention && format(mention.createdAt) && postUrl(mention.sourceUrl)) {
    rows.push(row('latest-post', source.latestPost ? mention.activityType==='reply' ? 'Tibo 最近回复' : 'Tibo 最近帖子'
      : mention.activityType==='reply' ? 'Tibo 最近相关回复' : 'Tibo 最近相关帖子',
      `<a href="${escape(mention.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escape(format(mention.createdAt))}</a> · ${escape(t(postLabels[mention.signal?.kind]??'暂未识别'))}<q>${escape(mention.text ?? '')}</q>`));
  } else rows.push(row('latest-post', 'Tibo 相关帖子',t('暂无可用帖子／回复')));
  const updated = format(source.checkedAt);
  const status = source.coverage?.history?.status === 'live' ? t('实时记录') : t('缓存 {date}',{date:source.dataAsOf??''});
  // A one-line-per-fact glance; every detailed row stays one click away.
  const dayFormat=value=>value&&Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat(uiLocale(locale),
    {timeZone,month:uiLocale(locale)==='zh-CN' ? 'numeric' : 'short',day:'numeric'}).format(new Date(value)) : null;
  const glance=[];
  const glanceRow=(key,label,value)=>glance.push(`<div data-forecast-glance="${key}"><dt>${escape(t(label))}</dt><dd>${value}</dd></div>`);
  // Next 12h / 24h / 48h side by side: short horizons to plan the day, 48h for the trend.
  const horizons=[[12,prediction?.next12Probability],[24,prediction?.next24Probability],[48,prediction?.next48Probability]]
    .filter(([,value])=>Number.isFinite(value));
  if(horizons.length)glance.push(`<div data-forecast-glance="next-hours"><dt>${escape(t('未来 reset 概率'))}</dt><dd class="forecast-horizons">${horizons.map(([hours,value])=>
    `<span data-forecast-horizon="${hours}"><small>${escape(t('{hours} 小时内 reset',{hours}))}</small><b>${Number((value*100).toFixed(1))}%</b></span>`).join('')}</dd></div>`);
  const windowFrom=dayFormat(prediction?.nextResetWindow?.from),windowTo=dayFormat(prediction?.nextResetWindow?.to);
  if(windowFrom&&windowTo)glanceRow('window','可能窗口',escape(windowFrom===windowTo ? windowFrom : `${windowFrom} – ${windowTo}`));
  if(last) {
    const hours=age===null ? null : Math.round(age*24);
    const ago=hours===null ? '' : hours<24 ? t('{hours} 小时前',{hours}) : t('{days} 天前',{days:Number(age.toFixed(1))});
    const lastShort=postUrl(source.lastResetSource)
      ? `<a href="${escape(source.lastResetSource)}" target="_blank" rel="noopener noreferrer">${escape(dayFormat(source.lastResetAt))}</a>` : escape(dayFormat(source.lastResetAt));
    glanceRow('last-reset','上次 reset',`${lastShort}${ago ? ` · ${escape(ago)}` : ''}`);
  }
  if(campaign?.status==='active'&&Number.isFinite(Date.parse(campaign.startsAt))&&Number.isFinite(Date.parse(campaign.endsAt))) {
    const DAY=86400000,start=Date.parse(campaign.startsAt);
    const total=Math.round((Date.parse(campaign.endsAt)-start)/DAY),day=Math.min(total,Math.floor((now.getTime()-start)/DAY)+1);
    glanceRow('campaign','活动',escape(t('第 {day} / {total} 天 · {end} 结束',{day,total,end:dayFormat(campaign.endsAt)})));
  }
  if(mention && format(mention.createdAt) && postUrl(mention.sourceUrl))
    glanceRow('tibo','Tibo',`<a href="${escape(mention.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escape(mention.signal?.scheduledFor && format(mention.signal.scheduledFor)
      ? t('已安排 · {time} 前',{time:format(mention.signal.scheduledFor)})
      : `${t(postLabels[mention.signal?.kind]??'暂未识别')} · ${dayFormat(mention.createdAt)}`)}</a>`);
  const statusLine=`<p>${escape(`${status}${updated ? t(' · 更新 {time}',{time:updated}) : ''} · ${t('你的时间（{zone}）',{zone:timeZone})}`)}${prediction ? ` · ${t(prediction.calibrated===true ? '模型预测' : '模型未校准')}` : ''}</p>`;
  return `<section class="forecast-summary" data-forecast-summary aria-label="${t('额外 reset 预测关键数据')}">${glance.length ? `<dl class="forecast-glance">${glance.join('')}</dl>` : ''}<details class="forecast-more"><summary>${t('更多数据')}</summary><dl>${rows.join('')}</dl>${statusLine}</details></section>`;
}
