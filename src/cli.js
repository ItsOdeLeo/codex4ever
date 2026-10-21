#!/usr/bin/env node
/** Terminal adapter for the one planning algorithm used by the page, the
 * plugin page and the MCP. It prints the same advice text as the MCP. */
import { readFile } from 'node:fs/promises';
import { planUsagePath } from './usage-path-planner.js';
import { predictReset } from './local-predictor.js';
import { classifyTiboPosts } from './llm-classifier.js';
import { predictionFromArchive } from './reset-forecast.js';
import { mcpUsageAdvice,renderMcpUsageAdvice } from './mcp-usage-advice.js';

const args = process.argv.slice(2);
const example = { weeklyRemaining: 62, weeklyResetDays: 4, weeklyResetHours: 6,
  resetDates: [], credits: 0, usageStrategy: 'balanced' };
const usage = `Codex4ever — Codex 用量规划（与网页、插件页面和 MCP 相同的算法；不启动 Web 服务）

  npm start -- --input input.json      规划手动输入的额度状态
  npm start -- --example               输出示例输入 JSON
  npm start -- --input input.json --json             输出完整机器可读结果
  npm start -- --input input.json --evidence evidence.json  用指定证据预测额外 reset
  npm start -- --input input.json --evidence evidence.json --llm-model MODEL  用兼容 Chat Completions 的 API 分类帖子
  npm start -- --input input.json --no-forecast      不计入额外 reset 预测

输入字段：weeklyRemaining、weeklyResetDays、weeklyResetHours、resetDates（YYYY-MM-DD）、credits，
可选 usageStrategy（balanced、keep-available、maximize、weekdays、weekend-focus）、averagePercentPerDay、paceMultiplier。
默认使用随附的公开 reset 记录预测；可选：--now ISO 时间、--time-zone IANA 时区、--language en|zh-CN、
--llm-base-url API 前缀（默认 https://api.openai.com/v1）、--help。
API Key 通过 CODEX4EVER_LLM_API_KEY 环境变量传入；本机兼容服务可以不设。`;

async function main() {
  if (args.includes('--help')) { console.log(usage); return; }
  const valued = ['--input', '--evidence', '--llm-model', '--llm-base-url', '--now', '--time-zone', '--language'];
  for (let i = 0; i < args.length; i++) {
    if (['--json', '--example', '--no-forecast'].includes(args[i])) continue;
    if (valued.includes(args[i]) && args[i + 1] && !args[i + 1].startsWith('--')) { i++; continue; }
    throw new Error(`未知参数或缺少参数值：${args[i]}\n${usage}`);
  }
  const value = flag => args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined;
  if (args.includes('--example')) { console.log(JSON.stringify(example, null, 2)); return; }
  if (!value('--input')) throw new Error(`需要 --input\n${usage}`);
  if (value('--llm-model') && !value('--evidence')) throw new Error('使用 LLM 分类时需要 --evidence');
  if (value('--llm-base-url') && !value('--llm-model')) throw new Error('--llm-base-url 需要配合 --llm-model');
  if (value('--evidence') && args.includes('--no-forecast')) throw new Error('--evidence 与 --no-forecast 不能同时使用');
  const language = value('--language') ?? 'zh-CN';
  if (!['en', 'zh-CN'].includes(language)) throw new Error('--language 需为 en 或 zh-CN');
  const now = new Date(value('--now') ?? Date.now());
  if (!Number.isFinite(now.getTime())) throw new Error('--now 时间无效');
  const timeZone = value('--time-zone') ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { usageStrategy, averagePercentPerDay = null, paceMultiplier, ...input } =
    JSON.parse(await readFile(value('--input'), 'utf8'));
  let prediction = null;
  if (value('--evidence')) {
    const evidence = JSON.parse(await readFile(value('--evidence'), 'utf8'));
    if (value('--llm-model')) evidence.posts = await classifyTiboPosts(evidence.posts || [], {
      model: value('--llm-model'), baseUrl: value('--llm-base-url') || undefined });
    prediction = predictReset({ ...evidence, now: now.toISOString(), timeZone });
  } else if (!args.includes('--no-forecast')) {
    const archive = JSON.parse(await readFile(new URL('../experiments/public-reset-events.json', import.meta.url), 'utf8'));
    const bundled = predictionFromArchive({ archive, now, timeZone });
    if (bundled.available) prediction = bundled.prediction;
    else console.error(bundled.reason);
  }
  const result = planUsagePath({ input, now, timeZone, prediction, averagePercentPerDay,
    ...(usageStrategy ? { usageStrategy } : {}), ...(paceMultiplier ? { paceMultiplier } : {}) });
  if (!result.available) throw new Error(result.reason ?? '暂时无法规划');
  const advice = mcpUsageAdvice(result, { prediction });
  if (args.includes('--json')) { console.log(JSON.stringify({ ...result, actionPlan: advice }, null, 2)); return; }
  console.log(renderMcpUsageAdvice(advice, { language }));
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
