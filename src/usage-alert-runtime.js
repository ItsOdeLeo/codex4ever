// Opt-in reminders, no separate install. The main channel is the plugin's
// Codex hook (usage-alert-hook.js), which shows the reminder in the
// conversation; this runtime keeps the plan baseline and, only if asked,
// also checks on a timer while the MCP runs and shows a system notification. Never redeems or
// spends anything; reading quota is local and costs no Codex usage.
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { dirname,join } from 'node:path';
import { execFile } from 'node:child_process';
import { alertBaseline,checkUsageAgainstPlan } from './usage-alert.js';
import { plannerEnv } from './planner-name.js';
import { plannerHome } from './planner-home.js';

export const defaultAlertFile=()=>plannerEnv('ALERT_FILE')
  ??join(plannerHome(),'alerts.json');

const appleString=value=>`"${String(value).replace(/\\/g,'\\\\').replace(/"/g,'\\"')}"`;
/** macOS banner; other systems only get the result in the conversation. */
export function systemNotify(title,message) {
  if(process.platform!=='darwin')return Promise.resolve(false);
  return new Promise(resolve=>execFile('osascript',['-e',`display notification ${appleString(message)} with title ${appleString(title)}`],
    error=>resolve(!error)));
}

export function createUsageAlerts({readSnapshot,replan,notify=systemNotify,file=defaultAlertFile(),
  setTimer=setInterval,clearTimer=clearInterval}) {
  let state={enabled:false,systemNotifications:false,intervalMinutes:30,language:'zh-CN',timeZone:null,baseline:null,lastNotifiedKey:null,lastCheck:null};
  let timer=null,loaded=false;
  const save=async()=>{
    if(!state.enabled&&!loaded)return;
    await mkdir(dirname(file),{recursive:true});
    await writeFile(file,JSON.stringify(state,null,1));
  };
  const load=async()=>{
    if(loaded)return;
    try {state={...state,...JSON.parse(await readFile(file,'utf8'))};}catch {/* First use. */}
    loaded=true;
  };
  const schedule=()=>{
    if(timer)clearTimer(timer);
    timer=state.enabled&&state.systemNotifications ? setTimer(()=>{check({notifyUser:true}).catch(()=>{});},state.intervalMinutes*60000) : null;
    timer?.unref?.();
  };
  /** The latest plan becomes the comparison baseline. */
  const recordPlan=async result=>{
    await load();
    const baseline=alertBaseline(result);
    if(!baseline)return;
    state.baseline=baseline;state.lastNotifiedKey=null;
    if(state.enabled)await save();
  };
  const check=async({notifyUser=false}={})=>{
    await load();
    const snapshot=await readSnapshot();
    const options={timeZone:state.timeZone??snapshot.timeZone??'UTC',language:state.language};
    let result=checkUsageAgainstPlan({baseline:state.baseline,snapshot,...options});
    // No plan yet, or a refill made the old one obsolete: plan again from now.
    if(['no-plan','refilled','stale'].includes(result.status)) {
      await replan({timeZone:options.timeZone,language:state.language});
      result={...checkUsageAgainstPlan({baseline:state.baseline,snapshot,...options}),replanned:result.status};
    }
    state.lastCheck={at:snapshot.readAt,status:result.status};
    if(notifyUser&&result.status==='over-plan') {
      // One banner per plan and severity step; a worse step notifies again.
      const key=[state.baseline?.createdAt,Math.floor(Math.max(0,result.overPercent)/5),result.earlierHours!==null].join(':');
      if(key!==state.lastNotifiedKey) {
        await notify(state.language==='zh-CN' ? 'Codex 额度提醒' : 'Codex quota reminder',result.message);
        state.lastNotifiedKey=key;
      }
    }
    if(state.enabled)await save();
    return result;
  };
  return {
    recordPlan,check,
    async start() {await load();schedule();return state.enabled;},
    async enable({intervalMinutes=state.intervalMinutes,language=state.language,timeZone=state.timeZone,
      systemNotifications=state.systemNotifications}={}) {
      await load();
      Object.assign(state,{enabled:true,intervalMinutes,language,timeZone,systemNotifications});
      await save();schedule();
      return check();
    },
    async disable() {await load();state.enabled=false;await save();schedule();},
    async status() {await load();const {baseline,...rest}=state;return {...rest,hasPlan:!!baseline,planCreatedAt:baseline?.createdAt??null};},
    stop() {if(timer)clearTimer(timer);timer=null;}
  };
}
