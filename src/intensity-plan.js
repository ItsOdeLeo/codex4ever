import { resetProbabilityByHours } from './local-predictor.js';

const HOUR = 3_600_000;
const EPS = 1e-8;
export const intensityChoices = [
  { id: 'steady', label: '保持当前强度', multiplier: 1 },
  { id: 'more', label: '增加 50%', multiplier: 1.5 },
  { id: 'flexible', label: '降低 50%', multiplier: 0.5 }
];

function number(value, label, min, max, integer = false) {
  if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value)))
    throw new Error(`${label}应为 ${min}–${max} 之间的${integer ? '整数' : '数字'}`);
  return value;
}

// A date expires at the next midnight in the user's timezone, including DST.
function expiryTime(value, timeZone) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error('备用 reset 请选择有效到期日期');
  const [year, month, day] = value.split('-').map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day)
    throw new Error('备用 reset 到期日期无效');
  const target = Date.UTC(year, month - 1, day + 1);
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit',
    day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  let candidate = target;
  for (let i = 0; i < 4; i++) {
    const parts = Object.fromEntries(formatter.formatToParts(candidate).map(part => [part.type, part.value]));
    const local = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
    const next = target - (local - candidate);
    if (next === candidate) break;
    candidate = next;
  }
  return candidate;
}

/** Pure resource forecast: three relative intensities, no work-value scoring. */
export function planIntensityUsage({ input, now = new Date(), prediction = null,
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone, creditsPerPercent = null } = {}) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error('当前时间无效');
  new Intl.DateTimeFormat('zh-CN', { timeZone }).format(now);
  const remaining = number(input?.weeklyRemaining, '周额度', 0, 100);
  const credits = number(input?.credits ?? 0, 'Credits', 0, 1e6);
  const horizon = number(input?.weeklyResetDays, '刷新剩余天数', 0, 7, true) * 24
    + number(input?.weeklyResetHours, '刷新剩余小时', 0, 23, true);
  if (horizon <= 0 || horizon > 168) throw new Error('正常刷新需位于未来一周内');
  if (creditsPerPercent !== null && (!Number.isFinite(creditsPerPercent) || creditsPerPercent <= 0))
    throw new Error('Credits 换算率需大于零');
  const dates = input.resetDates ?? [];
  if (!Array.isArray(dates) || dates.length > 8 || new Set(dates).size !== dates.length)
    throw new Error('备用 reset 最多 8 个，同一天最多一个');
  const resets = dates.map(expiresOn => {
    const expiresAt = expiryTime(expiresOn, timeZone);
    if (expiresAt <= now.getTime()) throw new Error(`备用 reset ${expiresOn} 已过期`);
    return { expiresOn, expiresAt: new Date(expiresAt).toISOString(),
      expiresInHours: (expiresAt - now.getTime()) / HOUR };
  }).sort((a, b) => a.expiresInHours - b.expiresInHours);
  const at = offset => {
    const date = new Date(now.getTime() + offset * HOUR);
    return Number.isFinite(date.getTime()) ? date.toISOString() : null;
  };
  const elapsedDays = (168 - horizon) / 24;
  // Nothing used yet this cycle (often right after a refill): plan from an
  // even split of what is left until the normal refresh instead of nothing.
  // Same rule as the account path: an hour of history before using a pace.
  const observed = elapsedDays >= 1 / 24 && remaining < 100 ? (100 - remaining) / elapsedDays : null;
  const evenSplit = observed === null && remaining > 0;
  const averagePercentPerDay = observed ?? (evenSplit ? remaining * 24 / horizon : null);
  const common = { now: now.toISOString(), timeZone, remainingPercent: remaining,
    elapsedDays, usedPercent: 100 - remaining, averagePercentPerDay, evenSplit,
    normalResetInHours: horizon, normalResetAt: at(horizon), resets,
    credits: { balance: credits, creditsPerPercent, included: creditsPerPercent !== null },
    predictionEnabled: prediction !== null };
  if (averagePercentPerDay === null) return { ...common, available: false, options: [],
    reason: '本轮还没有可计算的平均消耗，暂时无法估计用完日期。' };

  const options = intensityChoices.map(choice => {
    const dailyRate = averagePercentPerDay * choice.multiplier;
    const hourlyRate = dailyRate / 24;
    const initialDepletionHours = remaining / hourlyRate;
    const events = [], segments = [], used = new Set();
    let time = 0, quota = remaining, creditBalance = credits, stopAtHours = null;
    const advance = (end, source = 'quota') => {
      const startQuota = quota;
      const startCredits = creditBalance;
      const consumed = Math.max(0, end - time) * hourlyRate;
      if (source === 'quota') quota = Math.max(0, quota - consumed);
      else creditBalance = Math.max(0, creditBalance - consumed * creditsPerPercent);
      segments.push({ startHours: time, endHours: end, startQuota, startCredits, source });
      time = end;
    };
    while (time < horizon - EPS) {
      const depletion = time + quota / hourlyRate;
      if (depletion >= horizon - EPS) { advance(horizon); break; }
      const reset = resets.find(item => !used.has(item) && item.expiresInHours > time + EPS);
      if (reset) {
        // Keep the current quota until depletion, or redeem before an earlier
        // expiry. Early redemption is only planned when more quota is needed.
        const redeemAt = Math.min(depletion, Math.max(time, reset.expiresInHours - 1));
        advance(redeemAt);
        events.push({ kind: 'backup', atHours: time, at: at(time),
          expiresOn: reset.expiresOn, early: redeemAt + EPS < depletion,
          overwrittenPercent: quota });
        quota = 100;
        used.add(reset);
        continue;
      }
      advance(depletion);
      if (creditsPerPercent !== null && creditBalance > EPS) {
        events.push({ kind: 'credits', atHours: time, at: at(time) });
        const paidUntil = Math.min(horizon, time + creditBalance / (hourlyRate * creditsPerPercent));
        advance(paidUntil, 'credits');
      }
      if (time < horizon - EPS) stopAtHours = time;
      break;
    }
    const unusedExpiring = resets.filter(reset => !used.has(reset) && reset.expiresInHours <= horizon);
    for (const reset of unusedExpiring) events.push({ kind: 'expiry', atHours: reset.expiresInHours,
      at: reset.expiresAt, expiresOn: reset.expiresOn });
    events.sort((a, b) => a.atHours - b.atHours);
    const days = [];
    for (let start = 0; start < horizon - EPS; start += 24) {
      const end = Math.min(start + 24, horizon);
      const segment = segments.filter(item => item.startHours <= end + EPS).at(-1);
      const normalRefresh = end >= horizon - EPS;
      const stopped = stopAtHours !== null && end >= stopAtHours - EPS;
      const balance = normalRefresh ? 100 : stopped || segment?.source === 'credits' ? 0
        : Math.max(0, (segment?.startQuota ?? remaining) - (end - (segment?.startHours ?? 0)) * hourlyRate);
      days.push({ day: days.length + 1, startHours: start, endHours: end,
        at: at(end), remainingPercent: balance, stopped, normalRefresh });
    }
    const nextSupply = events.find(event => event.kind === 'backup' || event.kind === 'credits');
    const decisionHours = nextSupply?.atHours ?? stopAtHours ?? horizon;
    return { ...choice, dailyPercent: dailyRate, initialDepletionHours,
      initialDepletionAt: at(initialDepletionHours),
      canReachNormalRefresh: stopAtHours === null,
      stopAtHours, stopAt: stopAtHours === null ? null : at(stopAtHours),
      pauseHours: stopAtHours === null ? 0 : horizon - stopAtHours,
      backupUsed: used.size, expiredUnused: unusedExpiring,
      creditsSpent: credits - creditBalance, events, days,
      forecast: prediction ? { byHours: decisionHours, byAt: at(decisionHours),
        probability: resetProbabilityByHours(prediction, decisionHours),
        onReset: 'replan-from-full-balance' } : null };
  });
  return { ...common, available: true, options };
}
