import test from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { planUsagePath } from '../src/usage-path-planner.js';
import { createUsageAlerts } from '../src/usage-alert-runtime.js';

const HOUR=3600000,now=new Date('2026-10-20T12:00:00Z');
const at=hours=>new Date(now.getTime()+hours*HOUR).toISOString();
const plan=()=>planUsagePath({input:{weeklyRemaining:40,weeklyResetDays:4,weeklyResetHours:0,resetDates:[]},
  now,timeZone:'UTC',averagePercentPerDay:20});

test('开启后按计时器检查：超标才通知，同一程度只通知一次，更严重再通知；补满后重新规划',async()=>{
  const file=join(tmpdir(),`usage-planner-alerts-${process.pid}-${Date.now()}.json`);
  let reading={readAt:at(6),timeZone:'UTC',weekly:{remainingPercent:35,resetAt:plan().normalResetAt}};
  const notes=[],timers=[];let replans=0;
  const alerts=createUsageAlerts({file,readSnapshot:async()=>reading,
    replan:async()=>{replans++;await alerts.recordPlan(plan());},
    notify:async(title,message)=>{notes.push({title,message});},
    setTimer:(fn,ms)=>{timers.push({fn,ms});return timers.length;},clearTimer:()=>{}});
  const first=await alerts.enable({intervalMinutes:30,language:'zh-CN',timeZone:'UTC',systemNotifications:true});
  assert.equal(replans,1,'还没有计划时先按同一规则规划');
  assert.equal(first.status,'on-track');
  assert.equal(timers.at(-1).ms,30*60000);
  assert.equal(JSON.parse(await readFile(file,'utf8')).enabled,true,'开启状态写入本机，插件重启后继续');
  reading={...reading,weekly:{...reading.weekly,remainingPercent:28}};
  await timers.at(-1).fn();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(notes.length,1);
  assert.equal(notes[0].title,'Codex 额度提醒');
  assert.match(notes[0].message,/比计划多用了 7%/);
  await alerts.check({notifyUser:true});
  assert.equal(notes.length,1,'同一程度不重复打扰');
  reading={...reading,weekly:{...reading.weekly,remainingPercent:22}};
  await alerts.check({notifyUser:true});
  assert.equal(notes.length,2,'多用到下一个 5% 档再提醒');
  reading={readAt:at(7),timeZone:'UTC',weekly:{remainingPercent:100,resetAt:at(7+168)}};
  const refilled=await alerts.check({notifyUser:true});
  assert.equal(refilled.replanned,'refilled');
  assert.equal(replans,2);
  await alerts.disable();
  assert.equal((await alerts.status()).enabled,false);
});
