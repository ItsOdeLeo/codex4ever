const HOUR=3600000;
const round=value=>Number(value.toFixed(2));

/** Explain the already calculated observation using the original snapshot,
 * never the later normal-refresh date shifted by a planned bank redemption. */
export function usageConsumptionSummary(result,{locale='zh-CN'}={}) {
  const t=translator(locale);
  const refreshHours=(Date.parse(result.originalNormalResetAt??result.normalResetAt)-Date.parse(result.now))/HOUR;
  const elapsedHours=168-refreshHours,usedPercent=100-result.remainingPercent;
  const snapshotDaily=elapsedHours>0&&usedPercent>0 ? usedPercent*24/elapsedHours : null;
  const fromSnapshot=snapshotDaily!==null&&Math.abs(snapshotDaily-result.averagePercentPerDay)<1e-6;
  return {dailyPercent:result.averagePercentPerDay,remainingPercent:result.remainingPercent,
    refreshHours,elapsedHours,usedPercent,source:fromSnapshot ? 'weekly-window-average' : 'previous-observation',
    refreshLabel:t('{days}天 {hours}小时',{days:Math.floor(refreshHours/24),hours:round(refreshHours%24)}),
    calculationLabel:fromSnapshot ? t('{used}% ÷ {elapsed}小时 × 24',{used:round(usedPercent),elapsed:round(elapsedHours)})
      : t('沿用上次观测，本轮暂不足以估算')};
}
import { translator } from './ui-language.js';
