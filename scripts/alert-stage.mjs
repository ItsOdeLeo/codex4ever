// Stage the in-Codex quota reminder for a demo recording: the saved plan is
// replaced by one made three hours ago that expected about 10% more quota
// left than the account really has, so the next prompt in Codex shows the
// reminder. `--restore` puts the real reminder settings back.
import { readFile,writeFile,mkdir,copyFile,rm,access } from 'node:fs/promises';
import { dirname,join } from 'node:path';
import { readCodexUsage,normalizeCodexUsage } from '../src/codex-usage.js';
import { defaultAlertFile } from '../src/usage-alert-runtime.js';

const HOUR=3600000,file=defaultAlertFile(),hookState=join(dirname(file),'alerts-hook.json');
const backup=join(dirname(file),'demo-backup');
const exists=path=>access(path).then(()=>true,()=>false);

if(process.argv.includes('--restore')) {
  if(!await exists(backup)){console.log('没有演示备份，无需恢复。');process.exit(0);}
  for(const path of [file,hookState]) {
    const saved=join(backup,path.split('/').at(-1));
    if(await exists(saved))await copyFile(saved,path);else await rm(path,{force:true});
  }
  await rm(backup,{recursive:true,force:true});
  console.log('已恢复原来的提醒设置。');
  process.exit(0);
}

const now=new Date();
const snapshot=normalizeCodexUsage(await readCodexUsage(),now);
const actual=snapshot.weekly.remainingPercent,resetAt=snapshot.weekly.resetAt;
const settings=await readFile(file,'utf8').then(JSON.parse,()=>({}));
if(!await exists(backup)) {
  await mkdir(backup,{recursive:true});
  for(const path of [file,hookState])if(await exists(path))await copyFile(path,join(backup,path.split('/').at(-1)));
}
const createdAt=new Date(now-3*HOUR),daily=20;
const planned=Math.min(100,actual+daily*3/24+10);
const endAt=new Date(Math.min(Date.parse(resetAt),now.getTime()+3*24*HOUR));
const depletion=createdAt.getTime()+planned*24/daily*HOUR;
await writeFile(file,JSON.stringify({...settings,enabled:true,
  language:settings.language??'zh-CN',timeZone:settings.timeZone??snapshot.timeZone,lastNotifiedKey:null,
  baseline:{createdAt:createdAt.toISOString(),remainingPercent:planned,normalResetAt:resetAt,usageStrategy:'balanced',
    validUntil:endAt.toISOString(),plannedDepletionAt:depletion<=endAt.getTime() ? new Date(depletion).toISOString() : null,
    phases:[{startAt:createdAt.toISOString(),endAt:endAt.toISOString(),quotaBefore:planned,dailyPercent:daily}]}},null,1));
// Clear the hook's ten-minute throttle so the very next prompt is checked.
await rm(hookState,{force:true});
console.log(`演示已就绪：实际剩 ${actual}%，演示计划此刻应剩约 ${Number((planned-daily*3/24).toFixed(1))}%。`);
console.log('在 Codex 里发任意一句话即可看到提醒。录完运行：npm run alert:stage -- --restore');
