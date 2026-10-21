// Try the quota reminder without waiting: a simulated plan and a later reading
// that runs ahead of it, through the same rule and notification the plugin uses.
import { planUsagePath } from '../src/usage-path-planner.js';
import { alertBaseline,checkUsageAgainstPlan } from '../src/usage-alert.js';
import { systemNotify } from '../src/usage-alert-runtime.js';

const language=process.argv.includes('--en') ? 'en' : 'zh-CN';
const now=new Date(),timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone;
const later=hours=>new Date(now.getTime()+hours*3600000).toISOString();
// Plan: 40% left, Keep pace at 20%/day, normal refresh in 4 days.
const result=planUsagePath({input:{weeklyRemaining:40,weeklyResetDays:4,weeklyResetHours:0,resetDates:[]},
  now,timeZone,averagePercentPerDay:20});
const baseline=alertBaseline(result);
const zh=language==='zh-CN';
for(const [hours,remaining] of [[6,35],[6,28]]) {
  const check=checkUsageAgainstPlan({baseline,timeZone,language,
    snapshot:{readAt:later(hours),weekly:{remainingPercent:remaining,resetAt:baseline.normalResetAt}}});
  console.log(zh ? `\n${hours} 小时后剩 ${remaining}%（计划剩 ${Number(check.expectedRemainingPercent.toFixed(1))}%）：${check.status==='over-plan' ? '提醒' : '正常，不提醒'}`
    : `\nAfter ${hours} h, ${remaining}% left (plan ${Number(check.expectedRemainingPercent.toFixed(1))}%): ${check.status==='over-plan' ? 'reminder' : 'on track, no reminder'}`);
  if(check.message) {
    console.log(check.message);
    if(!process.argv.includes('--no-notify')) {
      const shown=await systemNotify(zh ? 'Codex 额度提醒（演示）' : 'Codex quota reminder (demo)',check.message);
      console.log(shown ? (zh ? '已弹出系统通知。' : 'System notification shown.') : (zh ? '此系统不支持通知，只显示文字。' : 'Notifications unavailable here; text only.'));
    }
  }
}
