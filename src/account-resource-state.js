/** Exact account inventory adapter for the existing planner. Manual date input
 * keeps its original path; API timestamps are never rounded to dates/hours. */
export function accountResourceState(snapshot,{now,timeZone,prediction=null}) {
  const stamp=now.getTime(),readAt=Date.parse(snapshot?.readAt),hour=3600000;
  if(!Number.isFinite(stamp)||!Number.isFinite(readAt)||stamp-readAt>15*60*1000||readAt-stamp>1000)
    throw new Error('用量快照已过期或时间无效，请重新读取 Codex 用量');
  new Intl.DateTimeFormat('en-CA',{timeZone}).format(now);
  if(snapshot.ordinaryUsageAllowed===false)throw new Error('Codex 当前不允许普通额度使用');
  const weekly=snapshot.weekly,remaining=weekly?.remainingPercent;
  const resetAt=Date.parse(weekly?.resetAt),horizon=(resetAt-stamp)/hour;
  if(weekly?.periodHours!==168||!Number.isFinite(remaining)||remaining<0||remaining>100||horizon<=0||horizon>168)
    throw new Error('Codex 未返回有效的七天额度窗口，请检查账户或使用手动输入');
  const date=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'});
  const banks=snapshot.bankedResets??[];
  if(!Array.isArray(banks))throw new Error('备用 reset 数据无效');
  const known=banks.filter(item=>item?.expiresAt!==null).map(item=>{
    const expiresAt=Date.parse(item.expiresAt);
    if(!Number.isFinite(expiresAt))throw new Error('备用 reset 到期时间无效');
    return {expiresOn:date.format(new Date(expiresAt)),expiresAt:new Date(expiresAt).toISOString(),
      expiresInHours:(expiresAt-stamp)/hour};
  }).filter(item=>item.expiresInHours>0).sort((a,b)=>a.expiresInHours-b.expiresInHours);
  const warnings=[];
  if(snapshot.bankedResetCount==null||!snapshot.bankedResetDetailsComplete||banks.some(item=>item.expiresAt===null))
    warnings.push('备用 reset 数量或到期详情不完整；只纳入已确认到期时间的库存');
  if(known.length>8)warnings.push('只模拟最早到期的八个备用 reset');
  const elapsedDays=(168-horizon)/24,used=100-remaining;
  const average=elapsedDays>=1/24&&used>0 ? used/elapsedDays : null;
  return {now:now.toISOString(),timeZone,remainingPercent:remaining,elapsedDays,usedPercent:used,
    averagePercentPerDay:average,normalResetInHours:horizon,normalResetAt:new Date(resetAt).toISOString(),
    resets:known.slice(0,8),credits:{balance:0,creditsPerPercent:null,included:false},
    predictionEnabled:prediction!==null,available:average!==null,
    ...(!average ? {reason:'本轮还没有可计算的平均消耗，暂时无法估计用完日期。'} : {}),
    resourceSource:'codex-app-server',resourceWarnings:warnings,
    paceAssumption:'从本轮窗口已消耗额度推算平均用量；不是近期实测速度'};
}
