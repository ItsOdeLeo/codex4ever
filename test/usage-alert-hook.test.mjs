import test from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeFile,mkdtemp } from 'node:fs/promises';
import { planUsagePath } from '../src/usage-path-planner.js';
import { alertBaseline } from '../src/usage-alert.js';
import { runQuotaHook,HOOK_CHECK_INTERVAL_MINUTES } from '../src/usage-alert-hook.js';

const HOUR=3600000,start=new Date('2026-10-20T12:00:00Z');
const at=hours=>new Date(start.getTime()+hours*HOUR);
const baseline=alertBaseline(planUsagePath({input:{weeklyRemaining:40,weeklyResetDays:4,weeklyResetHours:0,resetDates:[]},
  now:start,timeZone:'UTC',averagePercentPerDay:20}));

test('Codex hook：未开启时静默；超标时在 Codex 中提醒一次，并把提醒交给 Codex 转述',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'usage-planner-hook-')),file=join(dir,'alerts.json');
  let remaining=28,clock=at(6);
  const run=()=>runQuotaHook({event:'UserPromptSubmit',file,now:()=>clock,
    readSnapshot:async time=>({readAt:time.toISOString(),weekly:{remainingPercent:remaining,resetAt:baseline.normalResetAt}})});
  await writeFile(file,JSON.stringify({enabled:false,baseline,language:'zh-CN',timeZone:'UTC'}));
  assert.equal(await run(),null,'用户没有开启提醒时完全不读额度、不提示');
  await writeFile(file,JSON.stringify({enabled:true,baseline,language:'zh-CN',timeZone:'UTC'}));
  const first=await run();
  assert.match(first.systemMessage,/^Codex 额度提醒：比计划多用了 7%/);
  assert.equal(first.hookSpecificOutput.hookEventName,'UserPromptSubmit');
  assert.match(first.hookSpecificOutput.additionalContext,/Mention it in one short sentence/);
  clock=at(6.1);
  assert.equal(await run(),null,`${HOOK_CHECK_INTERVAL_MINUTES} 分钟内不重复读取`);
  clock=at(7);
  assert.equal(await run(),null,'同一程度不重复提醒');
  remaining=20;clock=at(8);
  assert.match((await run()).systemMessage,/比计划多用了/,'更严重时再提醒');
  remaining=100;clock=at(9);
  const refilled=await run();
  assert.equal(refilled.systemMessage,undefined,'补满后不打扰用户，只让 Codex 知道需要重新规划');
  assert.match(refilled.hookSpecificOutput.additionalContext,/usage_alerts/);
});
