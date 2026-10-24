import { resetProbabilityByHours } from './local-predictor.js';

const HOUR=3600000,EPS=1e-7;
const round=value=>Number(value.toFixed(1));

/** The MCP's executable result, derived from a single selected policy trace.
 * Text and structured advice share these facts. No LLM invents actions,
 * replenishments, bank dates, or probabilities while presenting the plan.
 */
export function mcpUsageAdvice(result,{prediction=null,usageSnapshot=null,sourceStatus=null}={}) {
  const origin=Date.parse(result.now),at=hours=>new Date(origin+hours*HOUR).toISOString();
  const normal=result.originalNormalResetAt??usageSnapshot?.weekly.resetAt??result.normalResetAt;
  const rate=result.averagePercentPerDay,remaining=result.remainingPercent;
  const normalHours=(Date.parse(normal)-origin)/HOUR;
  const advice={version:1,status:'ready',asOf:result.now,timeZone:result.timeZone,
    unit:'percentage-points-of-full-weekly-quota-per-24h',
    resources:{remainingPercent:remaining,normalRefreshAt:normal,
      bankedCount:usageSnapshot ? usageSnapshot.bankedResetCount : result.resets.length,
      knownBankDeadlines:result.resets.map(reset=>reset.expiresAt),
      inventoryComplete:usageSnapshot?.bankedResetDetailsComplete??true},
    currentUsage:{dailyPercent:rate,source:result.paceSource??'normal-window-average',shortHistory:!!result.shortHistory,
      depletionAt:rate>0&&remaining*24/rate<normalHours-EPS ? at(remaining*24/rate) : null},
    recommendation:null,stages:[],contingency:null,
    forecast:{enabled:!!prediction,calibrated:prediction?.calibrated===true,sourceStatus,
      probabilityMeaning:'model estimate of at least one additional public reset',
      probabilityBeforeDepletion:null},
    onObservedReset:{action:'read-account-and-replan',reason:'use-actual-quota-and-refresh-time'},
    warnings:[...(result.resourceWarnings??[])]};
  const short=usageSnapshot?.short;
  if(short?.remainingPercent===0&&Date.parse(short.resetAt)>origin) {
    advice.status='blocked';
    advice.recommendation={action:'wait-short-window',dailyPercent:0,until:short.resetAt,reviewAt:short.resetAt};
    return advice;
  }
  if(!result.available||!result.recommendation) {
    advice.status='needs-usage-estimate';
    advice.knownResourceDailyPercent=normalHours>0 ? remaining*24/normalHours : null;
    advice.recommendation={action:'provide-daily-usage-estimate',dailyPercent:null,reviewAt:null};
    return advice;
  }
  const search=result.recommendation,conditional=!!search.primary;
  if(search.availability)advice.availability=structuredClone(search.availability);
  const trace=conditional ? search.primary.trace : search.fallback;
  const first=trace.segments[0],bankNow=trace.events.find(event=>event.kind==='backup'&&event.atHours<EPS);
  const reviewHours=Math.min(24,first?.endHours??normalHours,normalHours);
  const depletion=trace.segments.find(segment=>segment.kind==='quota'&&segment.remainingAfter<EPS)?.endAt
    ??(remaining<EPS ? result.now : null);
  advice.basis=conditional ? 'conditional-forecast-preview' : 'scenario-selected-feedback-policy';
  advice.recommendation={action:bankNow ? 'use-banked-reset-now'
    : first?.kind==='rest' ? 'rest' : !first?.dailyPercent ? 'wait'
    : first.dailyPercent>rate+EPS ? 'increase' : first.dailyPercent<rate-EPS ? 'reduce' : 'maintain',
    dailyPercent:first?.dailyPercent??0,until:first?.endAt??normal,
    reviewAt:at(Math.max(0,reviewHours)),
    reviewReason:reviewHours<=(first?.endHours??Infinity)-EPS ? 'daily-checkpoint' : 'next-resource-or-usage-change',
    bankedResetNow:bankNow ? {index:bankNow.resetIndex,expiresAt:bankNow.expiresAt,reason:bankNow.reason} : null};
  // Stages of the plotted plan: with resets counted they assume those resets
  // happen; otherwise they are the no-new-reset branch. Replan after real supply.
  advice.stages=result.phasePlans.map(phase=>({from:phase.startAt,to:phase.endAt,
    action:phase.plannedRest ? 'rest' : phase.dailyPercent>EPS ? 'use' : 'wait',dailyPercent:phase.dailyPercent,
    condition:conditional ? 'assumed-resets-happen' : 'no-additional-public-reset-observed'}));
  const summarize=path=>{
    const waits=[];
    for(const segment of path.segments.filter(segment=>segment.kind==='pause')) {
      const previous=waits.at(-1);
      if(previous?.to===segment.startAt)previous.to=segment.endAt;
      else waits.push({from:segment.startAt,to:segment.endAt});
    }
    return {depletionAt:path.segments.find(segment=>segment.kind==='quota'&&segment.remainingAfter<EPS)?.endAt
      ??(remaining<EPS ? result.now : null),
    bankUses:path.events.filter(event=>event.kind==='backup').map(event=>({at:event.at,index:event.resetIndex,
      expiresAt:event.expiresAt,reason:event.reason,quotaBefore:event.overwrittenPercent,
      condition:event.reason==='quota-exhausted' ? 'no-new-reset-and-quota-exhausted' : 'expiry-or-explicit-constraint'})),
    waits,normalRefreshAt:path.events.find(event=>event.kind==='normal-refresh')?.at??null,
    stages:path.segments.filter(segment=>segment.kind!=='pause').map(segment=>({from:segment.startAt,
      to:segment.endAt,dailyPercent:segment.dailyPercent,action:segment.kind==='rest' ? 'rest' : 'use'}))};
  };
  advice.contingency={condition:'no-additional-public-reset',selected:summarize(search.fallback),
    continuityAlternative:search.bridgeAlternative ? summarize(search.bridgeAlternative) : null,
    alternativeRequiresUserChoice:true};
  if(depletion&&prediction) {
    const probability=resetProbabilityByHours(prediction,Math.max(0,(Date.parse(depletion)-origin)/HOUR));
    advice.forecast.probabilityBeforeDepletion=Number.isFinite(probability) ? probability : null;
    advice.forecast.depletionAt=depletion;
  }
  const preview=search.forecastAlternative??search.primary;
  if(preview)advice.forecastAlternative={conditional:true,assumedResetTimes:preview.assumedResetTimes,
    dailyPercent:preview.firstAction.dailyPercent,
    probabilityBeforeFirstAssumedReset:prediction
      ? resetProbabilityByHours(prediction,(Date.parse(preview.assumedResetTimes[0])-origin)/HOUR) : null,
    selected:conditional};
  return advice;
}

/** A compact factual rendering for clients that only display MCP text. */
export function renderMcpUsageAdvice(advice,{language='en'}={}) {
  const zh=language==='zh-CN';
  const date=value=>new Intl.DateTimeFormat(zh?'zh-CN':'en-GB',{timeZone:advice.timeZone,
    month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value));
  const p=value=>`${round(value)}%`;
  const resources=zh ? `周额度 ${p(advice.resources.remainingPercent)}；备用 ${advice.resources.bankedCount??'未知'} 个。`
    : `Quota ${p(advice.resources.remainingPercent)}; banked resets ${advice.resources.bankedCount??'unknown'}.`;
  const notices=[];
  if(!advice.resources.inventoryComplete)notices.push(zh ? '备用到期信息不完整，只使用已确认的库存。'
    : 'Bank deadlines are incomplete; only verified inventory is modeled.');
  if(advice.forecast.enabled&&['partial','unavailable','unknown'].includes(advice.forecast.sourceStatus?.social))
    notices.push(zh ? '帖子来源不完整或暂不可用，不能据此判断没有新动态。'
      : 'Social coverage is incomplete or unavailable; missing posts do not establish no new activity.');
  if(advice.forecast.enabled&&advice.forecast.sourceStatus?.history==='cached')notices.push(zh
    ? '重置历史来自缓存。' : 'Reset history is cached.');
  if(advice.status==='blocked')return [resources,zh ? `当前短窗口已耗尽，等待至 ${date(advice.recommendation.until)} 后重新读取额度。`
    : `Short-window quota is exhausted. Wait until ${date(advice.recommendation.until)}, then read usage again.`].join('\n');
  if(advice.status==='needs-usage-estimate')return [resources,zh
    ? '当前窗口没有足够的消耗记录，无法给出可靠的使用速度；可提供一个大概的日均消耗。'
    : 'This window lacks enough consumption history to estimate your pace. Provide an approximate daily consumption.',
    advice.knownResourceDailyPercent===null ? '' : zh
      ? `仅按现有额度均摊到正常刷新：${p(advice.knownResourceDailyPercent)} / 天。`
      : `Spreading known quota until normal refresh: ${p(advice.knownResourceDailyPercent)} / day.`,...notices].filter(Boolean).join('\n');
  const a=advice.recommendation;
  const rows=[resources];
  // Right after a refill there is no pace yet: say the plan starts from an
  // even split, never present it as the user's measured consumption.
  const source=advice.currentUsage.source;
  if(advice.currentUsage.dailyPercent!==null)rows.push(source==='even-split'&&!advice.currentUsage.shortHistory ? zh
    ? `本轮刚开始，还没有你的真实用量：先按剩余额度平均分到正常刷新前，约 ${p(advice.currentUsage.dailyPercent)} / 天；用一段时间后再规划会改用实际速度。`
    : `This window has just started, so there is no measured pace yet: the plan starts from an even split of the remaining quota until normal refresh, about ${p(advice.currentUsage.dailyPercent)} / day. Plan again after some use to switch to your actual pace.`
    : (zh
    ? `当前日均消耗 ${p(advice.currentUsage.dailyPercent)}（${source==='normal-window-average' ? '本轮窗口平均' : source==='even-split' ? '剩余额度平均分配' : '提供的估计'}）。`
    : `Current daily consumption ${p(advice.currentUsage.dailyPercent)} (${source==='normal-window-average' ? 'window average' : source==='even-split' ? 'even split of the remaining quota' : 'provided estimate'}).`)
      +(advice.currentUsage.shortHistory ? zh ? '本轮使用不到 1 小时，这个速度可能不具代表性。' : ' Less than an hour into this window, so this pace may not be representative.' : ''));
  if(advice.basis==='conditional-forecast-preview') {
    const times=(advice.forecastAlternative?.assumedResetTimes??[]).map(date).join(zh ? '、' : ' and ');
    rows.push(zh ? `本计划计入了较有把握的额外 reset（${times}，放在保守时刻）；若届时未发生，按下方未发生时的安排。`
      : `This plan counts likely extra resets (${times}, at conservative times); if they do not arrive, follow the no-reset plan below.`);
  }
  rows.push(a.action==='rest' ? (zh ? `当前休息；至 ${date(a.until)}。` : `Rest until ${date(a.until)}.`)
    : a.dailyPercent>0 ? (zh ? `建议日均消耗 ${p(a.dailyPercent)}；${date(a.reviewAt)} 复查。`
      : `Suggested consumption ${p(a.dailyPercent)} / day; review ${date(a.reviewAt)}.`)
    : (zh ? `当前等待；${date(a.reviewAt)} 复查。` : `Wait for now; review ${date(a.reviewAt)}.`));
  if(advice.availability) {
    const goal=advice.availability;
    rows.push(zh ? `细水长流：${goal.mode==='optimistic' ? '乐观' : '稳妥'}；目标预留约 ${p(goal.bufferPercent)}。`
      : `Keep available: ${goal.mode}; target buffer about ${p(goal.bufferPercent)}.`);
    if(goal.forecastUsed)rows.push(zh ? `${date(goal.reviewAt)} 前额外 reset：${p(goal.probabilityOfResetByReview*100)}（模型估计${advice.forecast.calibrated ? '' : '，未校准'}）。`
      : `Extra reset by ${date(goal.reviewAt)}: ${p(goal.probabilityOfResetByReview*100)} (model estimate${advice.forecast.calibrated ? '' : ', uncalibrated'}).`);
    if(goal.ifNoReset?.dailyPercent!==null&&goal.ifNoReset)rows.push(zh
      ? `届时若未 reset，日均消耗改为 ${p(goal.ifNoReset.dailyPercent)}，再按实际状态规划。`
      : `If no reset by then, use ${p(goal.ifNoReset.dailyPercent)} / day and replan from actual usage.`);
    if(goal.notification.shouldNotify)rows.push(zh
      ? goal.currentPaceDepletionAt ? `用量提醒：按当前用量，${date(goal.currentPaceDepletionAt)} 耗尽。` : '用量提醒：当前用量无法保留目标余量。'
      : goal.currentPaceDepletionAt ? `Pace alert: current usage depletes quota at ${date(goal.currentPaceDepletionAt)}.` : 'Pace alert: current usage would use the reserved margin.');
    const bank=advice.contingency.selected.bankUses[0];
    if(bank)rows.push(zh ? `备用仅按实际缺额或期限约束使用：${date(bank.at)}。`
      : `Banked reset only for actual shortage or a deadline: ${date(bank.at)}.`);
    return [...rows,...notices].join('\n');
  }
  const selected=advice.contingency.selected;
  if(selected.depletionAt)rows.push(zh ? `没有额外 reset：预计 ${date(selected.depletionAt)} 耗尽。`
    : `Without an extra reset: depletion ${date(selected.depletionAt)}.`);
  const bank=selected.bankUses[0],alternative=advice.contingency.continuityAlternative?.bankUses[0];
  if(bank)rows.push(zh ? `${bank.condition==='no-new-reset-and-quota-exhausted' ? '届时仍未 reset 且额度为零，才' : '按期限约束'}使用备用：${date(bank.at)}。`
    : `${bank.condition==='no-new-reset-and-quota-exhausted' ? 'Only if still depleted without a new reset, use' : 'Expiry/explicit constraint: use'} a banked reset at ${date(bank.at)}.`);
  else if(alternative)rows.push(zh ? `备用先保留；若 ${date(alternative.at)} 仍无额外 reset 且必须继续，可选择使用 1 个备用。`
    : `Keep the banked reset. If still depleted at ${date(alternative.at)} and work must continue, an alternative is to use one.`);
  else rows.push(zh ? '本计划不安排使用备用 reset。' : 'No banked reset is scheduled.');
  if(selected.waits[0])rows.push(zh ? `若无新补给，所选方案会停用至 ${date(selected.waits[0].to)}。`
    : `Without new supply, this plan includes a wait until ${date(selected.waits[0].to)}.`);
  const alternativeWait=advice.contingency.continuityAlternative?.waits[0];
  if(!bank&&alternative&&alternativeWait)rows.push(zh ? `备用方案也不能覆盖全部后续用量：${date(alternativeWait.from)} 起仍会有空档。`
    : `The bank alternative also leaves a later gap starting ${date(alternativeWait.from)}.`);
  if(advice.forecast.probabilityBeforeDepletion!==null)rows.push(zh
    ? `耗尽前额外 reset 概率：${p(advice.forecast.probabilityBeforeDepletion*100)}（模型估计${advice.forecast.calibrated ? '' : '，未校准'}）。`
    : `Extra reset before depletion: ${p(advice.forecast.probabilityBeforeDepletion*100)} (model estimate${advice.forecast.calibrated ? '' : ', uncalibrated'}).`);
  rows.push(zh ? '实际 reset 或用量变化后，重新读取并规划。百分数均以整周额度为基数。'
    : 'Read usage and replan after an actual reset or usage change. Percentages refer to full weekly quota.');
  rows.push(...notices);
  if(advice.warnings.some(warning=>warning.includes('八个')))rows.push(zh ? '只模拟最早到期的八个备用。'
    : 'Only the eight earliest bank deadlines are modeled.');
  return rows.join('\n');
}
