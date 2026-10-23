import { translator,uiLocale } from '../ui-language.js';

/** Goal settings and facts share the planner's resolved availability state. */
export function renderAvailabilityControls(availability,{locale='en',mode='optimistic',alertsEnabled=false,disabled=false}={},escape=String) {
  const t=translator(locale),date=value=>new Intl.DateTimeFormat(uiLocale(locale),{
    timeZone:availability?.timeZone,month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value));
  const n=value=>Number(value.toFixed(1));
  return `<div class="availability-controls" data-availability-mode="${mode}">
    <button type="button" data-toggle-pace-alerts aria-pressed="${alertsEnabled}"${disabled ? ' disabled' : ''}>${escape(t(alertsEnabled ? '检查时提醒：开启' : '检查时提醒：关闭'))}</button>
    ${availability?.notification.shouldNotify ? `<p class="availability-alert" role="status">${escape(availability.currentPaceDepletionAt
      ? t('按当前用量，{time} 耗尽。',{time:date(availability.currentPaceDepletionAt)}) : t('当前用量无法保留目标余量。'))}</p>` : ''}
    ${availability?.ifNoReset?.dailyPercent!==null&&availability?.ifNoReset ? `<p>${escape(t('若 {time} 仍未 reset：改为 {daily}% / 天。',{
      time:date(availability.ifNoReset.at),daily:n(availability.ifNoReset.dailyPercent)}))}</p>` : ''}
  </div>`;
}
