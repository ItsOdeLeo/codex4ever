/** Day numbers identify campaign entries, without hard-coding a campaign
 * length or treating every ordinary feature post as the daily announcement. */
export function campaignDay(post) {
  const explicit=post.signal?.campaignDay;
  if(Number.isInteger(explicit) && explicit>0 && explicit<=366)return explicit;
  const match=post.text?.match(/^\s*Day\s*0*(\d{1,3})(?:\b|\/)/im);
  return match ? Number(match[1]) : null;
}

export function campaignFeature(post) {
  return campaignDay(post)!==null && post.signal?.kind==='new_feature' && post.signal.confidence>=.8;
}

/** Rate multiplier inside a suppressed window (reset cooldown, campaign
 * feature day). These events are very unlikely, not impossible: a zero would
 * leave no plan for a reset that does arrive and would also forbid the most
 * likely time and the following-reset curve from ever landing there. */
export const SUPPRESSED_HAZARD_FACTOR=.05;

/** User's empirical assumption: a further automatic reset is very unlikely
 * during the reset activity day or the following activity day. Calendar days belong to the
 * publisher, so display timezone changes and DST cannot shorten the rule. */
export function resetCooldownRule({lastReset,now,timeZone}) {
  if(!Number.isFinite(lastReset))return null;
  const formatter=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'});
  const p=Object.fromEntries(formatter.formatToParts(lastReset).map(part=>[part.type,part.value]));
  const target=new Date(Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day)+2)).toISOString().slice(0,10);
  let lo=lastReset,hi=lastReset+72*3600000;
  while(hi-lo>1) {
    const mid=Math.floor((lo+hi)/2);
    if(formatter.format(mid)<target)lo=mid;else hi=mid;
  }
  if(now>=hi)return null;
  return {kind:'reset-next-day-cooldown',applied:true,hazardFactor:SUPPRESSED_HAZARD_FACTOR,
    lastResetAt:new Date(lastReset).toISOString(),from:new Date(lastReset).toISOString(),
    until:new Date(hi).toISOString(),untilHours:(hi-now)/3600000,
    basis:'user-requested-hard-assumption',timeZone};
}
