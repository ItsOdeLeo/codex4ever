// src/usage-alert-hook.js
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname as dirname2, join as join3 } from "node:path";

// src/codex-usage.js
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createInterface } from "node:readline";

// src/planner-name.js
var plannerEnv = (name, env = process.env) => env[`USAGE_PLANNER_${name}`] ?? env[`CODEX4EVER_${name}`];

// src/codex-usage.js
var HOUR_MS = 36e5;
var finite = (value) => typeof value === "number" && Number.isFinite(value);
var remaining = (window) => {
  if (!window || !finite(window.usedPercent) || window.usedPercent < 0 || window.usedPercent > 100 || !finite(window.windowDurationMins) || window.windowDurationMins <= 0 || !finite(window.resetsAt)) throw new Error("Codex \u672A\u8FD4\u56DE\u5B8C\u6574\u7684\u989D\u5EA6\u7A97\u53E3");
  return {
    remainingPercent: 100 - window.usedPercent,
    periodHours: window.windowDurationMins / 60,
    resetAt: new Date(window.resetsAt * 1e3).toISOString()
  };
};
var BUNDLED_CODEX_CLI = [
  "/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex",
  "/Applications/Codex.app/Contents/Resources/codex"
];
function defaultCodexCommand({ env = process.env, exists = existsSync } = {}) {
  return plannerEnv("CODEX_CLI", env) || env.CODEX_CLI_PATH || BUNDLED_CODEX_CLI.find((path) => exists(path)) || "codex";
}
async function readCodexUsage({ command = defaultCodexCommand(), timeoutMs = 15e3 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, ["app-server", "--stdio"], { stdio: ["pipe", "pipe", "pipe"] });
    let done = false;
    const finish = (error, value) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      child.stdin.end();
      if (error) {
        child.kill();
        reject(error);
      } else resolve(value);
    };
    const timer = setTimeout(() => finish(new Error("\u8BFB\u53D6 Codex \u7528\u91CF\u8D85\u65F6")), timeoutMs);
    child.stderr.resume();
    child.stdin.on("error", () => finish(new Error("Codex app-server \u8F93\u5165\u8FDE\u63A5\u5931\u8D25")));
    child.on("error", () => finish(new Error("\u65E0\u6CD5\u542F\u52A8 Codex CLI\uFF1B\u8BF7\u786E\u8BA4 codex \u5728 PATH \u4E2D")));
    child.on("exit", () => finish(new Error("Codex app-server \u672A\u8FD4\u56DE\u7528\u91CF\uFF1B\u8BF7\u68C0\u67E5\u672C\u673A\u767B\u5F55\u4E0E\u8FD0\u884C\u6743\u9650")));
    const send = (message) => child.stdin.write(`${JSON.stringify(message)}
`);
    createInterface({ input: child.stdout }).on("line", (line) => {
      let response;
      try {
        response = JSON.parse(line);
      } catch {
        return;
      }
      if (response.id === 1) {
        if (response.error) return finish(new Error("Codex app-server \u521D\u59CB\u5316\u5931\u8D25"));
        send({ method: "initialized" });
        send({
          id: 2,
          method: "account/rateLimits/read",
          params: { excludeResetCreditDetails: false }
        });
      } else if (response.id === 2) {
        if (response.error) finish(new Error("Codex \u672A\u5141\u8BB8\u8BFB\u53D6\u5F53\u524D\u8D26\u6237\u7528\u91CF"));
        else finish(null, response.result);
      }
    });
    send({ id: 1, method: "initialize", params: {
      clientInfo: { name: "usage-planner", title: "Usage Planner", version: "0.1.0" },
      capabilities: null
    } });
  });
}
function normalizeCodexUsage(raw, now = /* @__PURE__ */ new Date()) {
  if (!(now instanceof Date) || !finite(now.getTime())) throw new Error("\u5F53\u524D\u65F6\u95F4\u65E0\u6548");
  const bucket = raw?.rateLimitsByLimitId?.codex || raw?.rateLimits;
  const windows = [bucket?.primary, bucket?.secondary].filter(Boolean).map(remaining).sort((a, b) => b.periodHours - a.periodHours);
  if (!windows.length) throw new Error("Codex \u672A\u63D0\u4F9B\u53EF\u7528\u7684\u989D\u5EA6\u7A97\u53E3");
  const weekly = windows[0];
  const short = windows[1] || null;
  const resetInHours = (Date.parse(weekly.resetAt) - now.getTime()) / HOUR_MS;
  if (resetInHours <= 0) throw new Error("Codex \u7528\u91CF\u5FEB\u7167\u4E2D\u7684\u6B63\u5E38\u5237\u65B0\u65F6\u95F4\u5DF2\u8FC7\uFF0C\u8BF7\u91CD\u65B0\u8BFB\u53D6");
  const creditsRaw = bucket?.credits;
  const creditsBalance = creditsRaw?.balance == null ? null : Number(creditsRaw.balance);
  if (creditsBalance !== null && (!finite(creditsBalance) || creditsBalance < 0))
    throw new Error("Codex Credits \u4F59\u989D\u683C\u5F0F\u65E0\u6548");
  const resetSummary = raw?.rateLimitResetCredits;
  const bankedResets = (resetSummary?.credits || []).filter((item) => item.status === "available" && item.resetType === "codexRateLimits").map((item) => ({ expiresAt: item.expiresAt == null ? null : new Date(item.expiresAt * 1e3).toISOString() })).filter((item) => item.expiresAt === null || Date.parse(item.expiresAt) > now.getTime());
  const bankedResetCount = resetSummary == null ? null : Number(resetSummary.availableCount);
  if (bankedResetCount !== null && (!Number.isInteger(bankedResetCount) || bankedResetCount < 0))
    throw new Error("Codex \u5907\u7528 reset \u6570\u91CF\u65E0\u6548");
  return {
    source: "codex-app-server",
    readAt: now.toISOString(),
    planType: bucket?.planType || null,
    ordinaryUsageAllowed: raw?.ordinaryUsageAllowed ?? null,
    weekly: { ...weekly, resetInHours },
    short: short ? { ...short, resetInHours: (Date.parse(short.resetAt) - now.getTime()) / HOUR_MS } : null,
    credits: {
      balance: creditsBalance,
      unlimited: Boolean(creditsRaw?.unlimited),
      hasCredits: Boolean(creditsRaw?.hasCredits)
    },
    bankedResetCount,
    bankedResets,
    bankedResetDetailsComplete: bankedResetCount !== null && bankedResets.length >= bankedResetCount
  };
}

// src/usage-alert.js
var HOUR = 36e5;
var usageAlertRule = Object.freeze({
  overPlanPercent: 5,
  // used this many points of weekly quota more than planned
  earlierFraction: 0.2,
  // or: the current pace runs out this share of the planned span earlier
  minimumElapsedHours: 1
  // a pace needs at least an hour of observation
});
function plannedRemainingAt(baseline, at) {
  const time = Date.parse(at);
  for (const phase of baseline.phases) {
    const start = Date.parse(phase.startAt), stop = Date.parse(phase.endAt);
    if (time >= start && time <= stop) return Math.max(0, phase.quotaBefore - phase.dailyPercent * (time - start) / HOUR / 24);
  }
  return null;
}
function checkUsageAgainstPlan({ baseline, snapshot, suggestedDailyPercent = null, timeZone = "UTC", language = "zh-CN" }) {
  if (!baseline) return { status: "no-plan" };
  const now = Date.parse(snapshot?.readAt), actual = snapshot?.weekly?.remainingPercent;
  if (!Number.isFinite(now) || !Number.isFinite(actual)) return { status: "no-reading" };
  const resetAt = Date.parse(snapshot.weekly.resetAt), plannedReset = Date.parse(baseline.normalResetAt);
  if (Number.isFinite(resetAt) && Number.isFinite(plannedReset) && Math.abs(resetAt - plannedReset) > HOUR || actual > baseline.remainingPercent + 0.5) return { status: "refilled" };
  const expected = plannedRemainingAt(baseline, new Date(now).toISOString());
  if (expected === null) return { status: "stale" };
  const overPercent = expected - actual;
  const elapsedHours = (now - Date.parse(baseline.createdAt)) / HOUR;
  const used = baseline.remainingPercent - actual;
  let projectedDepletionAt = null, earlierHours = null;
  if (elapsedHours >= usageAlertRule.minimumElapsedHours && used > 0) {
    const rate = used * 24 / elapsedHours;
    projectedDepletionAt = new Date(now + actual * 24 / rate * HOUR).toISOString();
    const plannedEnd2 = Date.parse(baseline.plannedDepletionAt ?? baseline.validUntil);
    const plannedSpan = plannedEnd2 - Date.parse(baseline.createdAt);
    const projectedSpan = Date.parse(projectedDepletionAt) - Date.parse(baseline.createdAt);
    if (plannedSpan > 0 && projectedSpan < plannedSpan * (1 - usageAlertRule.earlierFraction))
      earlierHours = (plannedEnd2 - Date.parse(projectedDepletionAt)) / HOUR;
  }
  const status = overPercent >= usageAlertRule.overPlanPercent - 1e-9 || earlierHours !== null ? "over-plan" : "on-track";
  const plannedEnd = Date.parse(baseline.plannedDepletionAt ?? baseline.validUntil);
  suggestedDailyPercent ??= plannedEnd > now ? actual * 24 / ((plannedEnd - now) / HOUR) : null;
  const facts = {
    status,
    expectedRemainingPercent: expected,
    actualRemainingPercent: actual,
    overPercent,
    projectedDepletionAt,
    plannedDepletionAt: baseline.plannedDepletionAt,
    earlierHours,
    suggestedDailyPercent,
    rule: { ...usageAlertRule }
  };
  return { ...facts, message: status === "over-plan" ? alertMessage(facts, { timeZone, language }) : null };
}
var percent = (value) => `${Number(value.toFixed(1))}%`;
function alertMessage(facts, { timeZone = "UTC", language = "zh-CN" } = {}) {
  const zh = language === "zh-CN";
  const date = (value) => new Intl.DateTimeFormat(zh ? "zh-CN" : "en-GB", {
    timeZone,
    month: zh ? "long" : "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).format(new Date(value));
  const lines = [];
  if (facts.overPercent > 0) lines.push(zh ? `\u6BD4\u8BA1\u5212\u591A\u7528\u4E86 ${percent(facts.overPercent)}\uFF08\u8BA1\u5212\u5269 ${percent(facts.expectedRemainingPercent)}\uFF0C\u5B9E\u9645\u5269 ${percent(facts.actualRemainingPercent)}\uFF09\u3002` : `${percent(facts.overPercent)} over plan (planned ${percent(facts.expectedRemainingPercent)} left, actually ${percent(facts.actualRemainingPercent)}).`);
  if (facts.projectedDepletionAt) lines.push(zh ? `\u6309\u73B0\u5728\u7684\u901F\u5EA6\u4F1A\u5728 ${date(facts.projectedDepletionAt)} \u7528\u5B8C${facts.earlierHours ? `\uFF0C\u6BD4\u8BA1\u5212\u65E9 ${Math.round(facts.earlierHours)} \u5C0F\u65F6` : ""}\u3002` : `At this pace quota runs out ${date(facts.projectedDepletionAt)}${facts.earlierHours ? `, ${Math.round(facts.earlierHours)} h earlier than planned` : ""}.`);
  if (Number.isFinite(facts.suggestedDailyPercent)) lines.push(zh ? `\u5EFA\u8BAE\u628A\u7528\u91CF\u964D\u5230\u6BCF\u5929 ${percent(facts.suggestedDailyPercent)}\u3002` : `Consider lowering usage to ${percent(facts.suggestedDailyPercent)} per day.`);
  return lines.join(zh ? "" : " ");
}

// src/usage-alert-runtime.js
import { dirname, join as join2 } from "node:path";

// src/planner-home.js
import { existsSync as existsSync2 } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
function plannerHome(env = process.env) {
  const configured = plannerEnv("HOME", env);
  if (configured) return configured;
  const next = join(homedir(), ".usage-planner"), old = join(homedir(), ".codex4ever");
  return !existsSync2(next) && existsSync2(old) ? old : next;
}

// src/usage-alert-runtime.js
var defaultAlertFile = () => plannerEnv("ALERT_FILE") ?? join2(plannerHome(), "alerts.json");

// src/usage-alert-hook.js
var HOOK_CHECK_INTERVAL_MINUTES = 10;
var readJson = async (file) => {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return null;
  }
};
async function runQuotaHook({
  event: event2 = "UserPromptSubmit",
  file = defaultAlertFile(),
  now = () => /* @__PURE__ */ new Date(),
  readSnapshot = async (time) => normalizeCodexUsage(await readCodexUsage(), time)
} = {}) {
  const settings = await readJson(file);
  if (!settings?.enabled || !settings.baseline) return null;
  const stateFile = join3(dirname2(file), "alerts-hook.json");
  const state = await readJson(stateFile) ?? {};
  const time = now();
  if (state.lastCheckAt && time - Date.parse(state.lastCheckAt) < HOOK_CHECK_INTERVAL_MINUTES * 6e4) return null;
  state.lastCheckAt = time.toISOString();
  const zh = (settings.language ?? "zh-CN") === "zh-CN";
  let output2 = null;
  try {
    const snapshot = await readSnapshot(time);
    const result = checkUsageAgainstPlan({
      baseline: settings.baseline,
      snapshot,
      timeZone: settings.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: settings.language ?? "zh-CN"
    });
    let key = null, notice = null, context = null;
    if (result.status === "over-plan") {
      key = [settings.baseline.createdAt, Math.floor(Math.max(0, result.overPercent) / 5), result.earlierHours !== null].join(":");
      notice = `${zh ? "Codex \u989D\u5EA6\u63D0\u9192" : "Codex quota reminder"}\uFF1A${result.message}`;
      context = `Usage Planner quota reminder for the user (from their local quota, compared with their plan): ${result.message} Mention it in one short sentence at the start of your reply, in the user's language, then continue with their request.`;
    } else if (["refilled", "stale"].includes(result.status)) {
      key = `${settings.baseline.createdAt}:${result.status}`;
      context = `Usage Planner: the user's quota changed since their last plan (refill or plan ended), so quota reminders are paused. If convenient, call the usage-planner usage_alerts tool with action "check" once to replan; do not mention this otherwise.`;
    }
    if (key && key !== state.lastKey) {
      state.lastKey = key;
      output2 = { ...notice ? { systemMessage: notice } : {}, hookSpecificOutput: { hookEventName: event2, additionalContext: context } };
    }
  } catch {
  }
  try {
    await mkdir(dirname2(stateFile), { recursive: true });
    await writeFile(stateFile, JSON.stringify(state));
  } catch {
  }
  return output2;
}

// src/quota-hook.js
var input = "";
process.stdin.setEncoding("utf8");
for await (const chunk of process.stdin) input += chunk;
var event = "UserPromptSubmit";
try {
  event = JSON.parse(input || "{}").hook_event_name ?? event;
} catch {
}
var output = await runQuotaHook({ event }).catch(() => null);
if (output) process.stdout.write(JSON.stringify(output));
process.exit(0);
