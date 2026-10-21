import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { planUsagePath } from '../src/usage-path-planner.js';
import { planIntensityUsage } from '../src/intensity-plan.js';
import { predictionFromArchive } from '../src/reset-forecast.js';
import { renderResetForecastSummary } from '../src/reset-forecast-summary.js';
import { layoutStrategyTree } from '../src/strategy-tree-layout.js';

const now = new Date('2026-10-16T08:00:00Z');
const input = { weeklyRemaining: 40, weeklyResetDays: 4, weeklyResetHours: 0, resetDates: ['2026-10-17'] };
const archive = { retrievedAt: '2026-10-16', campaignTimeZone: 'America/Los_Angeles',
  events: [6, 9, 12, 15].map(day => ({ kind: 'automatic',
    at: `2026-10-${String(day).padStart(2, '0')}T05:00:00Z` })) };
const fixtures = [
  { zone: 'America/New_York', expiry: '2026-10-18T04:00:00.000Z', last: '10/15 01:00', point: '10月18日 00:30' },
  { zone: 'Asia/Shanghai', expiry: '2026-10-17T16:00:00.000Z', last: '10/15 13:00', point: '10月18日 12:30' },
  { zone: 'UTC', expiry: '2026-10-18T00:00:00.000Z', last: '10/15 05:00', point: '10月18日 04:30' }
];

test('库默认跟随调用时的当地时区：预测显示、备用到期日和规划入口不固定柏林', () => {
  const previous = process.env.TZ;
  try {
    for (const fixture of fixtures) {
      process.env.TZ = fixture.zone;
      for (const planner of [planUsagePath, planIntensityUsage]) {
        const result = planner({ input, now });
        assert.equal(result.timeZone, fixture.zone);
        assert.equal(result.resets[0].expiresAt, fixture.expiry);
      }
      const source = predictionFromArchive({ archive, now }), prediction = source.prediction;
      assert.equal(prediction.displayTimeZone, fixture.zone);
      assert.equal(prediction.releaseClock.timeZone, 'America/Los_Angeles');
      const { campaignTimeZone, ...legacyArchive } = archive;
      const legacy = predictionFromArchive({ archive: legacyArchive, now }).prediction;
      assert.equal(legacy.releaseClock.timeZone, 'America/Los_Angeles', '旧Tibo档案缺少时区时也不能用观看者时区统计发布习惯');
      assert.equal(legacy.resetTimeEstimate.pointAt, prediction.resetTimeEstimate.pointAt);
      assert.equal(prediction.resetTimeEstimate.pointAt, '2026-10-18T05:00:00.000Z',
        '显示时区变化不能改变预测事件本身的UTC时刻');
      assert.equal(prediction.resetTimeMode.pointAt,'2026-10-18T04:30:00.000Z');
      assert.equal(legacy.resetTimeMode.pointAt,prediction.resetTimeMode.pointAt);
      const summary = renderResetForecastSummary({ source, prediction, now });
      assert.ok(summary.includes(fixture.last));
      assert.ok(summary.includes(fixture.zone));
      assert.doesNotMatch(summary, /Europe\/Berlin|undefined/);
      const result = planUsagePath({ input, now, prediction, heldResetIndices: [0] });
      assert.equal(layoutStrategyTree(result, { prediction }).forecastFocus.label, fixture.point);
    }
  } finally {
    if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous;
  }
});

test('显式timeZone优先于服务器本地时区，活动时区独立，错误时区不悄悄回退', () => {
  const previous = process.env.TZ;
  try {
    process.env.TZ = 'America/New_York';
    const timeZone = 'Asia/Tokyo';
    for (const planner of [planUsagePath, planIntensityUsage]) {
      const result = planner({ input, now, timeZone });
      assert.equal(result.timeZone, timeZone);
      assert.equal(result.resets[0].expiresAt, '2026-10-17T15:00:00.000Z');
    }
    const source = predictionFromArchive({ archive, now, timeZone });
    assert.equal(source.prediction.displayTimeZone, timeZone);
    assert.equal(source.prediction.timeZone, 'America/Los_Angeles');
    const html = renderResetForecastSummary({ source, prediction: source.prediction, timeZone, now });
    assert.match(html, /10\/15 14:00/);
    assert.match(html, /最可能 reset 时间<\/dt><dd>10\/18 13:30/);
    assert.throws(() => planUsagePath({ input, now, timeZone: 'Invalid/Zone' }), /time zone/i);
  } finally {
    if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous;
  }
});

test('独立预测命令默认取运行环境时区，也可用--time-zone显式指定远程用户时区', async () => {
  // Run the actual entry point in an isolated directory so its report cannot
  // overwrite the user's existing output/reset-prediction.json.
  const directory = await mkdtemp(join(tmpdir(), 'codex4ever-time-zone-'));
  try {
    await cp(new URL('../src', import.meta.url), join(directory, 'src'), { recursive: true });
    await mkdir(join(directory, 'scripts'));
    await cp(new URL('../scripts/predict-reset.mjs', import.meta.url), join(directory, 'scripts/predict-reset.mjs'));
    await writeFile(join(directory, 'package.json'), '{"type":"module"}');
    await writeFile(join(directory, 'archive.json'), JSON.stringify(archive));
    const run = promisify(execFile), args = ['scripts/predict-reset.mjs', '--input', 'archive.json', '--now', now.toISOString(), '--json'];
    for (const [extra, zone, last] of [[[], 'America/New_York', '10/15 01:00'],
      [['--time-zone', 'Asia/Shanghai'], 'Asia/Shanghai', '10/15 13:00']]) {
      const { stdout } = await run(process.execPath, [...args, ...extra], {
        cwd: directory, env: { ...process.env, TZ: 'America/New_York' }, maxBuffer: 1024 * 1024 });
      const result = JSON.parse(stdout);
      assert.equal(result.prediction.displayTimeZone, zone);
      assert.equal(result.summary['上次公开重置'], last);
      assert.equal(result.prediction.releaseClock.timeZone, 'America/Los_Angeles');
      assert.equal(result.prediction.resetTimeEstimate.pointAt, '2026-10-18T05:00:00.000Z');
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});
