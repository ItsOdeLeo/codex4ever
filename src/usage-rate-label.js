const round = value => Number(value.toFixed(1));

/** Percent of weekly quota consumed per day, followed by the relative change
 * in usage. A 50% reduction of 20%/day means 10%/day, not 50 quota points. */
export function usageRateComparison(baselineDailyPercent, dailyPercent) {
  if (!Number.isFinite(baselineDailyPercent) || baselineDailyPercent <= 0
    || !Number.isFinite(dailyPercent) || dailyPercent < 0) return '';
  const change = (dailyPercent / baselineDailyPercent - 1) * 100;
  if (Math.abs(change) < 1e-5) return '保持当前用量';
  return `日均周额度 ${round(baselineDailyPercent)}% → ${round(dailyPercent)}% · 用量${change > 0 ? '增加' : '减少'} ${round(Math.abs(change))}%`;
}

/** Algorithm advice uses one wording; manual choices remain user choices. */
export function usageRateAdvice(baselineDailyPercent, dailyPercent,locale='zh-CN') {
  if (!Number.isFinite(baselineDailyPercent) || baselineDailyPercent <= 0
    || !Number.isFinite(dailyPercent) || dailyPercent <= 0) return '';
  if (Math.abs(dailyPercent-baselineDailyPercent) < 1e-5) return '';
  return translator(locale)('建议 {daily}% / 天',{daily:round(dailyPercent)});
}

export function usageRateDetail(baselineDailyPercent,dailyPercent,locale='zh-CN') {
  return translator(locale)('{daily}% / 天',{daily:round(dailyPercent)});
}
import { translator } from './ui-language.js';
