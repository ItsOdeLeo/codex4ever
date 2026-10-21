import test from 'node:test';
import assert from 'node:assert/strict';
import { planUsagePath } from '../src/usage-path-planner.js';
import { layoutStrategyTree, renderStrategyTree } from '../src/strategy-tree-layout.js';

const now = new Date('2026-10-14T12:00:00Z');
const plan = (input = {}, extra = {}) => planUsagePath({ now, timeZone: 'Europe/Berlin',
  input: { weeklyRemaining: 40, weeklyResetDays: 4, weeklyResetHours: 0,
    credits: 0, resetDates: [], ...input }, ...extra });

test('推荐路径连接到正常刷新，所有节点均可达且在画布内', () => {
  const graph = layoutStrategyTree(plan());
  const ids = new Set(graph.nodes.map(node => node.id));
  const visited = new Set(['decision:0']);
  while (true) {
    const count = visited.size;
    for (const edge of graph.edges) {
      assert.ok(ids.has(edge.from) && ids.has(edge.to));
      assert.match(edge.path, /^M /);
      if (visited.has(edge.from)) visited.add(edge.to);
    }
    if (visited.size === count) break;
  }
  assert.equal(visited.size, ids.size);
  assert.ok(visited.has('normal-reset'));
  for (const node of graph.nodes.filter(node => Number.isFinite(node.y))) {
    assert.ok(node.y >= 0 && node.y + (node.height ?? 0) <= graph.height);
  }
  const html = renderStrategyTree(graph, String);
  assert.match(html, /<svg/);
  assert.match(html, /正常刷新/);
});

test('零余额立即使用备用：操作日期在节点上，补满不写成 → 100%', () => {
  const result = plan({ weeklyRemaining: 0, weeklyResetDays: 5, resetDates: ['2026-11-10'] });
  const graph = layoutStrategyTree(result);
  const backup = graph.nodes.find(node => node.type === 'backup');
  assert.match(backup.lines[0], /10月14日 14:00/);
  assert.match(backup.lines[1], /11\/10到期/);
  assert.doesNotMatch(backup.lines.join(' '), /→ 100%/);
  assert.match(renderStrategyTree(graph, String), /graph-backup/);
});

test('额度漏斗按真实余额等比例收窄，耗尽为尖端，正常刷新重新展开', () => {
  const graph = layoutStrategyTree(plan());
  const usage = graph.funnel.bands[0];
  const refresh = graph.funnel.bands.find(band => band.kind === 'refresh');
  assert.equal(usage.startQuota, 40);
  assert.equal(usage.endQuota, 0);
  assert.ok(Math.abs(usage.startHalf * 2 - graph.funnel.maxThickness * 0.4) < 1e-9);
  assert.equal(usage.endHalf, 0);
  assert.equal(refresh.startQuota, 100);
  assert.equal(refresh.startHalf * 2, graph.funnel.maxThickness);
  assert.deepEqual(graph.funnel.refills.map(item => item.kind), ['normal']);
  const html = renderStrategyTree(graph, String);
  assert.match(html, /class="quota-band quota-usage"/);
});

test('备用兑换在同一时点补满，不在旧余额上叠加100%', () => {
  const graph = layoutStrategyTree(plan({ resetDates: ['2026-10-17'] },
    { now: new Date('2026-10-15T08:00:00Z') }));
  const refill = graph.funnel.refills.find(item => item.kind === 'backup');
  assert.equal(refill.before, 0);
  assert.equal(refill.after, 100);
  const before = graph.funnel.bands.find(band => band.x2 === refill.x);
  const after = graph.funnel.bands.find(band => band.x1 === refill.x);
  assert.equal(before.endHalf, 0);
  assert.equal(after.startQuota, 100);
  assert.equal(after.startHalf * 2, graph.funnel.maxThickness);
});
