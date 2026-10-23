// In-conversation quota reminder, run by the plugin's Codex hook before a
// prompt (and at session start). Reads local quota only (no Codex usage), at
// most every few minutes, and only after the user turned reminders on.
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { dirname,join } from 'node:path';
import { readCodexUsage,normalizeCodexUsage } from './codex-usage.js';
import { checkUsageAgainstPlan } from './usage-alert.js';
import { defaultAlertFile } from './usage-alert-runtime.js';

export const HOOK_CHECK_INTERVAL_MINUTES=10;

const readJson=async file=>{try {return JSON.parse(await readFile(file,'utf8'));}catch {return null;}};

/** Returns the hook's JSON output, or null to stay silent. Never throws. */
export async function runQuotaHook({event='UserPromptSubmit',file=defaultAlertFile(),now=()=>new Date(),
  readSnapshot=async time=>normalizeCodexUsage(await readCodexUsage(),time)}={}) {
  const settings=await readJson(file);
  if(!settings?.enabled||!settings.baseline)return null;
  // The hook keeps its own state, so the MCP rewriting its file cannot erase it.
  const stateFile=join(dirname(file),'alerts-hook.json');
  const state=await readJson(stateFile)??{};
  const time=now();
  if(state.lastCheckAt&&time-Date.parse(state.lastCheckAt)<HOOK_CHECK_INTERVAL_MINUTES*60000)return null;
  state.lastCheckAt=time.toISOString();
  const zh=(settings.language??'zh-CN')==='zh-CN';
  let output=null;
  try {
    const snapshot=await readSnapshot(time);
    const result=checkUsageAgainstPlan({baseline:settings.baseline,snapshot,
      timeZone:settings.timeZone??Intl.DateTimeFormat().resolvedOptions().timeZone,language:settings.language??'zh-CN'});
    let key=null,notice=null,context=null;
    if(result.status==='over-plan') {
      key=[settings.baseline.createdAt,Math.floor(Math.max(0,result.overPercent)/5),result.earlierHours!==null].join(':');
      notice=`${zh ? 'Codex 额度提醒' : 'Codex quota reminder'}：${result.message}`;
      context=`Usage Planner quota reminder for the user (from their local quota, compared with their plan): ${result.message} `
        +'Mention it in one short sentence at the start of your reply, in the user\'s language, then continue with their request.';
    } else if(['refilled','stale'].includes(result.status)) {
      key=`${settings.baseline.createdAt}:${result.status}`;
      context='Usage Planner: the user\'s quota changed since their last plan (refill or plan ended), so quota reminders are paused. '
        +'If convenient, call the usage-planner usage_alerts tool with action "check" once to replan; do not mention this otherwise.';
    }
    if(key&&key!==state.lastKey) {
      state.lastKey=key;
      output={...(notice ? {systemMessage:notice} : {}),hookSpecificOutput:{hookEventName:event,additionalContext:context}};
    }
  } catch {/* A failed read must never block the user's prompt. */}
  try {await mkdir(dirname(stateFile),{recursive:true});await writeFile(stateFile,JSON.stringify(state));}catch {/* Best effort. */}
  return output;
}
