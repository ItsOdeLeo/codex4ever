const HOUR=3600000,EPS=1e-7;

export const usageStrategies=Object.freeze([
  Object.freeze({id:'balanced',label:'保持节奏',description:'按当前速度用，看什么时候用完'}),
  Object.freeze({id:'keep-available',label:'保持可用',description:'尽量一直有额度，必要时放慢'}),
  Object.freeze({id:'maximize',label:'用满 100%',description:'在下次补满前刚好用完'}),
  Object.freeze({id:'weekdays',label:'周末不用',description:'周末休息，额度分给工作日'}),
  Object.freeze({id:'weekend-focus',label:'只在周末用',description:'优先在周末用完额度'})
]);
export const validUsageStrategy=value=>usageStrategies.some(strategy=>strategy.id===value);

/** Calendar constraints belong to the planner, never to timeline controls.
 * Day boundaries use the user's IANA zone, including 23/25-hour DST days.
 * A suggested rate is the rate needed to empty quota by the next refill;
 * callers with a real throughput limit may supply dailyCapacityPercent.
 */
export function usageStrategyCalendar({now,timeZone,horizonHours=504}) {
  const origin=Date.parse(now),format=new Intl.DateTimeFormat('en-CA',{
    timeZone,year:'numeric',month:'2-digit',day:'2-digit',weekday:'short'});
  const parts=stamp=>Object.fromEntries(format.formatToParts(stamp).map(part=>[part.type,part.value]));
  const key=stamp=>{const p=parts(stamp);return `${p.year}-${p.month}-${p.day}`;};
  const slots=[];
  for(let start=0;start<horizonHours-EPS;) {
    const stamp=origin+start*HOUR,day=key(stamp);
    let low=stamp,high=stamp+27*HOUR;
    while(high-low>1) {const mid=Math.floor((low+high)/2);if(key(mid)===day)low=mid;else high=mid;}
    const end=Math.min(horizonHours,(high-origin)/HOUR);
    slots.push({startHours:start,endHours:end,date:day,weekend:['Sat','Sun'].includes(parts(stamp).weekday)});
    start=end;
  }
  return {
    slots,
    allocate({strategy,start,end,quota,dailyCapacityPercent=null,cycleStart=start}) {
      const spans=slots.filter(slot=>slot.endHours>start+EPS&&slot.startHours<end-EPS);
      const hasWeekend=slots.some(slot=>slot.weekend&&slot.endHours>cycleStart+EPS&&slot.startHours<end-EPS);
      const allowed=slot=>strategy==='weekdays' ? !slot.weekend
        : strategy==='weekend-focus'&&hasWeekend ? slot.weekend : true;
      const availableHours=spans.reduce((sum,slot)=>sum+(allowed(slot)
        ? Math.max(0,Math.min(end,slot.endHours)-Math.max(start,slot.startHours)) : 0),0);
      const current=spans.find(slot=>slot.startHours<=start+EPS&&slot.endHours>start+EPS);
      const active=!!current&&allowed(current);
      let nextChange=end;
      for(const slot of spans)if(slot.startHours>start+EPS&&allowed(slot)!==active) {nextChange=slot.startHours;break;}
      const needed=availableHours>EPS ? quota*24/availableHours : 0;
      return {dailyPercent:active ? Math.min(needed,dailyCapacityPercent??Infinity) : 0,
        availableHours,nextChange,rest:!active,requiredDailyPercent:needed};
    }
  };
}
