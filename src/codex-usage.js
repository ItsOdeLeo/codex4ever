/** Read the signed-in local Codex account through the app-server read method. */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createInterface } from 'node:readline';

const HOUR_MS = 3_600_000;
const finite = value => typeof value === 'number' && Number.isFinite(value);
const remaining = window => {
  if (!window || !finite(window.usedPercent) || window.usedPercent < 0 || window.usedPercent > 100
    || !finite(window.windowDurationMins) || window.windowDurationMins <= 0
    || !finite(window.resetsAt)) throw new Error('Codex 未返回完整的额度窗口');
  return { remainingPercent: 100 - window.usedPercent,
    periodHours: window.windowDurationMins / 60,
    resetAt: new Date(window.resetsAt * 1000).toISOString() };
};

// The desktop app keeps its CLI inside the bundle, off the shell PATH; hooks
// and other launchers may not inherit an explicit path.
const BUNDLED_CODEX_CLI=['/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex',
  '/Applications/Codex.app/Contents/Resources/codex'];

export function defaultCodexCommand({env=process.env,exists=existsSync}={}) {
  return env.CODEX4EVER_CODEX_CLI||env.CODEX_CLI_PATH||BUNDLED_CODEX_CLI.find(path=>exists(path))||'codex';
}

export async function readCodexUsage({ command = defaultCodexCommand(), timeoutMs = 15_000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, ['app-server', '--stdio'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let done = false;
    const finish = (error, value) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      child.stdin.end();
      if (error) { child.kill(); reject(error); }
      else resolve(value);
    };
    const timer = setTimeout(() => finish(new Error('读取 Codex 用量超时')), timeoutMs);
    child.stderr.resume(); // Never forward auth or diagnostic data through the MCP response.
    child.stdin.on('error', () => finish(new Error('Codex app-server 输入连接失败')));
    child.on('error', () => finish(new Error('无法启动 Codex CLI；请确认 codex 在 PATH 中')));
    child.on('exit', () => finish(new Error('Codex app-server 未返回用量；请检查本机登录与运行权限')));
    const send = message => child.stdin.write(`${JSON.stringify(message)}\n`);
    createInterface({ input: child.stdout }).on('line', line => {
      let response;
      try { response = JSON.parse(line); } catch { return; }
      if (response.id === 1) {
        if (response.error) return finish(new Error('Codex app-server 初始化失败'));
        send({ method: 'initialized' });
        send({ id: 2, method: 'account/rateLimits/read',
          params: { excludeResetCreditDetails: false } });
      } else if (response.id === 2) {
        if (response.error) finish(new Error('Codex 未允许读取当前账户用量'));
        else finish(null, response.result);
      }
    });
    send({ id: 1, method: 'initialize', params: {
      clientInfo: { name: 'codex4ever', title: 'Codex4ever', version: '0.1.0' },
      capabilities: null
    } });
  });
}

/** Keep only decision inputs, never account ID or opaque reset-credit IDs. */
export function normalizeCodexUsage(raw, now = new Date()) {
  if (!(now instanceof Date) || !finite(now.getTime())) throw new Error('当前时间无效');
  const bucket = raw?.rateLimitsByLimitId?.codex || raw?.rateLimits;
  const windows = [bucket?.primary, bucket?.secondary]
    .filter(Boolean).map(remaining).sort((a, b) => b.periodHours - a.periodHours);
  if (!windows.length) throw new Error('Codex 未提供可用的额度窗口');
  const weekly = windows[0];
  const short = windows[1] || null;
  const resetInHours = (Date.parse(weekly.resetAt) - now.getTime()) / HOUR_MS;
  if (resetInHours <= 0) throw new Error('Codex 用量快照中的正常刷新时间已过，请重新读取');
  const creditsRaw = bucket?.credits;
  const creditsBalance = creditsRaw?.balance == null ? null : Number(creditsRaw.balance);
  if (creditsBalance !== null && (!finite(creditsBalance) || creditsBalance < 0))
    throw new Error('Codex Credits 余额格式无效');
  const resetSummary = raw?.rateLimitResetCredits;
  const bankedResets = (resetSummary?.credits || [])
    .filter(item => item.status === 'available' && item.resetType === 'codexRateLimits')
    .map(item => ({ expiresAt: item.expiresAt == null ? null
      : new Date(item.expiresAt * 1000).toISOString() }))
    .filter(item => item.expiresAt === null || Date.parse(item.expiresAt) > now.getTime());
  const bankedResetCount = resetSummary == null ? null : Number(resetSummary.availableCount);
  if (bankedResetCount !== null && (!Number.isInteger(bankedResetCount) || bankedResetCount < 0))
    throw new Error('Codex 备用 reset 数量无效');
  return { source: 'codex-app-server', readAt: now.toISOString(),
    planType: bucket?.planType || null, ordinaryUsageAllowed: raw?.ordinaryUsageAllowed ?? null,
    weekly: { ...weekly, resetInHours },
    short: short ? { ...short, resetInHours: (Date.parse(short.resetAt) - now.getTime()) / HOUR_MS } : null,
    credits: { balance: creditsBalance, unlimited: Boolean(creditsRaw?.unlimited),
      hasCredits: Boolean(creditsRaw?.hasCredits) },
    bankedResetCount, bankedResets,
    bankedResetDetailsComplete: bankedResetCount !== null
      && bankedResets.length >= bankedResetCount };
}

/** A one-snapshot average since the normal window start, not an observed recent slope. */
export function estimateUsagePace(usage, now = new Date()) {
  if (!(now instanceof Date) || !finite(now.getTime())) throw new Error('当前时间无效');
  const windowEnd = Date.parse(usage.weekly.resetAt);
  const windowStart = windowEnd - usage.weekly.periodHours * HOUR_MS;
  const elapsedHours = (now.getTime() - windowStart) / HOUR_MS;
  const untilResetHours = (windowEnd - now.getTime()) / HOUR_MS;
  if (elapsedHours <= 0 || untilResetHours <= 0) throw new Error('额度窗口时间与当前时间不一致');
  const usedPercent = 100 - usage.weekly.remainingPercent;
  // At the very start of a window a tiny amount of usage gives a meaningless rate.
  const rateReliableEnough = elapsedHours >= 1;
  const averagePercentPerDay = rateReliableEnough ? usedPercent / elapsedHours * 24 : null;
  const sustainablePercentPerDay = usage.weekly.remainingPercent / untilResetHours * 24;
  const exhaustionInHours = averagePercentPerDay > 0
    ? usage.weekly.remainingPercent / (averagePercentPerDay / 24) : null;
  return { windowStartAt: new Date(windowStart).toISOString(), elapsedHours,
    untilResetHours, usedPercent, remainingPercent: usage.weekly.remainingPercent,
    averagePercentPerDay, sustainablePercentPerDay,
    paceRatio: averagePercentPerDay === null || sustainablePercentPerDay === 0
      ? null : averagePercentPerDay / sustainablePercentPerDay,
    projectedExhaustionAt: exhaustionInHours === null ? null
      : new Date(now.getTime() + exhaustionInHours * HOUR_MS).toISOString(),
    projectedExhaustionInHours: exhaustionInHours,
    assumption: '按本轮正常刷新以来的平均消耗外推；若中途用过备用或额外 reset，此估计不可靠' };
}
