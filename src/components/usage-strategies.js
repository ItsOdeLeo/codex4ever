import { usageStrategies } from '../usage-strategy.js';
import { translator } from '../ui-language.js';

/** `after` holds extra controls shown right below a strategy's button. */
export function renderUsageStrategies({selected='balanced',locale='en',disabled=false,after={}}={},escape=String) {
  const t=translator(locale);
  return `<div class="usage-strategies" role="group" aria-label="${t('用量策略')}">${usageStrategies.map(strategy=>
    `<button type="button" data-usage-strategy="${strategy.id}" aria-pressed="${selected===strategy.id}" title="${escape(t(strategy.description))}"${disabled ? ' disabled' : ''}><strong>${escape(t(strategy.label))}</strong></button>${after[strategy.id]??''}`).join('')}</div>`;
}
