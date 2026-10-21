import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCodexUsage, estimateUsagePace } from '../src/codex-usage.js';

const now = new Date('2026-10-13T12:00:00Z');
const at = hours => Math.round(now.getTime() / 1000 + hours * 3600);
const snapshot = () => ({ ordinaryUsageAllowed: true,
  rateLimitsByLimitId: { codex: { planType: 'pro',
    primary: { usedPercent: 90, windowDurationMins: 10080, resetsAt: at(156.5) },
    secondary: { usedPercent: 40, windowDurationMins: 300, resetsAt: at(4.5) },
    credits: { hasCredits: true, unlimited: false, balance: '42.5' } } },
  rateLimitResetCredits: { availableCount: 2, credits: [
    { id: 'opaque-1', resetType: 'codexRateLimits', status: 'available', expiresAt: at(24) },
    { id: 'opaque-2', resetType: 'codexRateLimits', status: 'available', expiresAt: at(48) }
  ] } });

test('真实用量字段映射保留正常刷新和备用 reset 的精确时间', () => {
  const usage = normalizeCodexUsage(snapshot(), now);
  assert.equal(usage.weekly.remainingPercent, 10);
  assert.equal(usage.weekly.resetInHours, 156.5);
  assert.equal(usage.short.remainingPercent, 60);
  assert.equal(usage.credits.balance, 42.5);
  assert.equal(usage.bankedResetCount, 2);
  assert.equal(usage.bankedResets.length, 2);
  assert.equal(JSON.stringify(usage).includes('opaque-1'), false);
  assert.deepEqual(usage.bankedResets.map(reset => reset.expiresAt),
    [new Date(at(24) * 1000).toISOString(), new Date(at(48) * 1000).toISOString()]);
});

test('缺失备用 reset 详情时不伪造到期时间', () => {
  const raw = snapshot();
  raw.rateLimitResetCredits.credits = null;
  const usage = normalizeCodexUsage(raw, now);
  assert.equal(usage.bankedResetCount, 2);
  assert.equal(usage.bankedResets.length, 0);
  assert.equal(usage.bankedResetDetailsComplete, false);
});

test('从正常窗口起点和当前余量推算消耗速度与预计耗尽时间', () => {
  const usage = normalizeCodexUsage(snapshot(), now);
  const pace = estimateUsagePace(usage, now);
  assert.equal(pace.elapsedHours, 11.5);
  assert.ok(Math.abs(pace.averagePercentPerDay - 90 / 11.5 * 24) < 1e-8);
  assert.ok(Math.abs(pace.sustainablePercentPerDay - 10 / 156.5 * 24) < 1e-8);
  assert.ok(pace.paceRatio > 100);
  assert.ok(pace.projectedExhaustionInHours < 2);
});
