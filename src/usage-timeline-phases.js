/** Select labels only. Calendar rests and repeated work rates need no extra
 * annotations; timestamps, consumption and reset decisions remain untouched.
 */
export function timelineUsagePhases(phases,xAtHours) {
  if(!phases.some(phase=>phase.plannedRest))return phases.filter((phase,index)=>!index
    ||phase.resourceCycle!==phases[index-1].resourceCycle||phase.constrained
    ||Math.abs(phase.dailyPercent-phases[index-1].dailyPercent)>=1e-5);
  const groups=[];
  for(const phase of phases) {
    if(phase.plannedRest)continue;
    const previous=groups.at(-1),last=previous?.at(-1);
    if(last&&phase.resourceCycle===last.resourceCycle&&!phase.constrained&&!last.constrained
      &&Math.abs(phase.dailyPercent-last.dailyPercent)<1e-5)previous.push(phase);
    else groups.push([phase]);
  }
  // Prefer the longer work span over a tiny fragment beside a rest/refill.
  const width=phase=>xAtHours(phase.endHours)-xAtHours(phase.startHours);
  return groups.map(group=>group.reduce((best,phase)=>width(phase)>width(best) ? phase : best));
}
