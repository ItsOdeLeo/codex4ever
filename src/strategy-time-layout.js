import { translator,uiLocale } from './ui-language.js';
import { strategyTreeView, strategyMilestoneView } from './strategy-tree-view.js';
import { quotaFunnelGeometry } from './strategy-quota-funnel.js';
import { strategyTimeAxis } from './strategy-time-axis.js';
import { strategyTimeRange } from './strategy-time-range.js';
import { resetProbabilityBins, layoutResetProbabilityPlot, layoutResetProbabilityPeaks } from './reset-probability-plot.js';
import { resetProbabilityByHours } from './local-predictor.js';
import { followingResetDistribution,followingResetProbabilityByHours } from './reset-sequence-forecast.js';
import { resetAssumptionContent,resetOpportunityLayout } from './components/reset-element.js';
import { timelineUsagePhases } from './usage-timeline-phases.js';

const round = value => Number(value.toFixed(1));
// Below this timeline width the label gutter folds into captions above rows.
export const COMPACT_TIMELINE_WIDTH=480;
// Phone event cards: narrow enough that two share a row.
const COMPACT_CARD_WIDTH=112;

/** Place the solved policy on a shared date axis, without changing decisions. */
export function layoutTimeStrategy(result, { prediction = null, viewportWidth,displayEndHours:fixedEndHours=null,locale='zh-CN' } = {}) {
  const t=translator(locale);
  if (!result.predictionEnabled) prediction = null;
  const points = result.milestones.points;
  const end = points.at(-1);
  const forecastMilestones = result.resetForecast?.milestones ?? [];
  const estimate = result.resetForecast?.enabled
    ? result.resetForecast.timeMode ?? result.resetForecast.timeEstimate : null;
  const following=result.resetForecast?.enabled ? result.resetForecast.followingReset : null;
  const distribution = resetProbabilityBins({ prediction, now: result.now,
    horizonHours: Math.max(336, Math.ceil(estimate?.toHours ?? 0)) });
  // Same condition as the plan: the assumed first reset when there is one.
  const secondCondition=following?.conditionalOn??null;
  const secondDistribution=followingResetDistribution({prediction,now:result.now,firstAt:secondCondition});
  const windowEnd = (Date.parse(prediction?.nextResetWindow?.to) - Date.parse(result.now)) / 3600000;
  const focusEstimate = distribution ? distribution.mode : estimate;
  const forecastEndHours = distribution ? Math.ceil(Math.max(focusEstimate?.toHours ?? 0,following?.toHours??following?.pointHours??0,
    Math.min(distribution.horizonHours, Number.isFinite(windowEnd) ? Math.max(48, windowEnd) : 168))) : null;
  const displayEndHours = fixedEndHours??strategyTimeRange(result,{prediction,forecastEndHours:forecastEndHours??0});
  if(!Number.isFinite(displayEndHours)||displayEndHours<=0||displayEndHours<end.hours-1e-6)
    throw new Error('日期轴范围必须覆盖完整计划');
  const plotEndHours=distribution ? displayEndHours : null;
  const forecasts = (result.forecastCalendar ?? []).filter(point => point.hours <= (distribution ? displayEndHours : end.hours) + 1e-6)
    .map(point => ({ ...point, calendar: true }));
  for (const point of result.flexibleSchedule ? [] : forecastMilestones) {
    const existing = forecasts.findIndex(item => Math.abs(item.hours - point.hours) < 1e-6);
    if (existing >= 0) forecasts[existing] = { ...forecasts[existing], kind: point.kind };
    else forecasts.push(point);
  }
  forecasts.sort((a,b)=>a.hours-b.hours);
  // Phones: no label gutter. Lane names sit above their rows instead, so the
  // whole horizon fits the screen width without sideways scrolling.
  const compact=Number.isFinite(viewportWidth)&&viewportWidth<COMPACT_TIMELINE_WIDTH;
  const laneWidth=compact ? 0 : Number.isFinite(viewportWidth)&&viewportWidth<680 ? 128 : 176;
  const leftPadding=compact ? 6 : laneWidth+16;
  let axis = strategyTimeAxis({ now: result.now, timeZone: result.timeZone,
    endHours: displayEndHours,leftPadding });
  if(Number.isFinite(viewportWidth)&&viewportWidth>0) {
    // No minimum day/graph width: that freezes most side-panel sizes. Adapt
    // date-label density instead, keeping every event on the same time scale.
    const left=Math.min(leftPadding,Math.max(0,viewportWidth-2));
    const padding=Math.min(axis.padding,Math.max(0,(viewportWidth-left-1)/2));
    const dayWidth=(viewportWidth-left-padding)/axis.days.length;
    axis=strategyTimeAxis({now:result.now,timeZone:result.timeZone,endHours:displayEndHours,dayWidth,padding,leftPadding:left});
  }
  const dateStride=Math.max(1,Math.ceil(56/axis.dayWidth));
  const dateLabels=axis.days.filter((day,index)=>index%dateStride===0);
  const time = value => new Intl.DateTimeFormat(uiLocale(locale), { timeZone: result.timeZone,
    month: uiLocale(locale)==='zh-CN' ? 'long' : 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value));
  const clock = value => new Intl.DateTimeFormat('en-GB', { timeZone: result.timeZone,
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value));
  const date = value => new Intl.DateTimeFormat(uiLocale(locale), { timeZone: result.timeZone,
    month: 'numeric', day: 'numeric' }).format(new Date(value));
  const plotLabelWidth=Math.max(1,axis.width-axis.leftPadding-4);
  const clamp = (x, width) => Math.max(axis.leftPadding, Math.min(axis.width - width - 4, x));
  const forecastRows = [];
  // Plot labels attach to peaks; retain daily cutoff labels for older layouts.
  const displayedForecasts = distribution ? []
    : result.flexibleSchedule ? forecasts.filter(point =>
      clock(point.at) === '00:00' || Math.abs(point.hours - end.hours) < 1e-6) : forecasts;
  const forecastLayout = displayedForecasts.map(point => {
    const width = Math.min(plotLabelWidth,result.flexibleSchedule ? 132 : point.kind ? 104 : 66);
    const x = axis.xAtHours(point.hours),left = clamp(x - width / 2, width);
    let row = forecastRows.findIndex(right => right + 6 <= left);
    if (row < 0) row = forecastRows.length;
    forecastRows[row] = left + width;
    const midnight = clock(point.at) === '00:00';
    const dateLabel = midnight ? `${date(Date.parse(point.at) - 1)}结束` : `${date(point.at)} ${clock(point.at)}`;
    return { ...point, x, left, y: 37 + row * 42, width,
      label: result.flexibleSchedule ? `截至 ${dateLabel.replace('结束', '')}`
        : point.kind ? `${point.kind === 'backup' ? '用备用' : '耗尽'}前 · ${clock(point.at)}` : dateLabel };
  });
  const forecastEndY = forecastRows.length ? 37 + forecastRows.length * 42 : 30;
  const probabilityPlot = layoutResetProbabilityPlot({ distribution, endHours: plotEndHours,
    xAtHours: axis.xAtHours, topY: forecastEndY + 64,height:42 });
  const followingPlot=layoutResetProbabilityPlot({distribution:secondDistribution,endHours:plotEndHours,
    xAtHours:axis.xAtHours,topY:(probabilityPlot?.bottomY??forecastEndY)+64,height:42});
  const focusWidth = Math.min(probabilityPlot ? 200 : 480,plotLabelWidth);
  // The guide lines mark the conservative times the plan counts (and where
  // the assumption cards sit), not the curves' most likely hours.
  const planned=(marker,hours)=>marker&&Number.isFinite(hours)&&hours>0 ? {...marker,pointHours:hours,
    pointAt:new Date(Date.parse(result.now)+hours*3600000).toISOString(),planned:true} : marker;
  const firstMarker=planned(focusEstimate,result.forecastScenario?.available ? result.forecastScenario.hours : NaN);
  const secondMarker=planned(following,result.forecastScenario?.following?.available ? result.forecastScenario.following.hours : NaN);
  const forecastFocus = firstMarker ? { ...firstMarker, x: axis.xAtHours(firstMarker.pointHours),
    fromX: axis.xAtHours(firstMarker.fromHours), toX: axis.xAtHours(firstMarker.toHours),
    left: clamp(axis.xAtHours(firstMarker.pointHours) - focusWidth / 2, focusWidth),
    y: forecastEndY + 8, width: focusWidth,
    label: time(firstMarker.pointAt), clockLabel: clock(firstMarker.pointAt) } : null;
  if (forecastFocus && probabilityPlot) {
    forecastFocus.y = probabilityPlot.topY - 38;
    forecastFocus.cumulativeProbability = resetProbabilityByHours(prediction, firstMarker.pointHours);
  }
  const forecastFollowing=secondMarker ? {...secondMarker,x:axis.xAtHours(secondMarker.pointHours),
    left:clamp(axis.xAtHours(secondMarker.pointHours)-focusWidth/2,focusWidth),width:focusWidth,
    y:followingPlot ? followingPlot.topY-38 : forecastFocus?.y??forecastEndY+8,
    label:time(secondMarker.pointAt),clockLabel:clock(secondMarker.pointAt)} : null;
  if(forecastFollowing?.planned)forecastFollowing.cumulativeProbability=
    followingResetProbabilityByHours(prediction,result.now,secondMarker.pointHours,secondCondition)??forecastFollowing.cumulativeProbability;
  // Phones keep only the marker's cumulative value; peak labels would crowd the curve.
  const forecastPeaks=compact ? [] : layoutResetProbabilityPeaks({plot:probabilityPlot,timeZone:result.timeZone,
    focus:forecastFocus,otherLabels:forecastFollowing ? [{...forecastFollowing,height:34}] : [],
    cumulativeAtHours:hours=>resetProbabilityByHours(prediction,hours)});
  const followingPeaks=compact ? [] : layoutResetProbabilityPeaks({plot:followingPlot,timeZone:result.timeZone,
    focus:forecastFollowing,cumulativeAtHours:hours=>followingResetProbabilityByHours(prediction,result.now,hours,secondCondition)});
  const lastPlot=followingPlot??probabilityPlot;
  const headingY = lastPlot ? lastPlot.bottomY+20 : forecastEndY + (forecastFocus ? 92 : 0) + 12;
  const phaseControls = [];
  const phaseWidth = 198;
  const quotaThickness=40,labelGap=10,phaseY=headingY+28;
  const restPeriods=(result.phasePlans??[]).filter(phase=>phase.plannedRest);
  const shownPhases=timelineUsagePhases(result.phasePlans??[],axis.xAtHours);
  for(const [index,phase] of shownPhases.entries()) {
    const startX=axis.xAtHours(phase.startHours);
    const endX=axis.xAtHours(restPeriods.length ? phase.endHours : shownPhases[index+1]?.startHours??phase.endHours);
    const inset=Math.min(compact ? 2 : 8,Math.max(0,(endX-startX)/4));
    const x=startX+inset;
    // A label belongs to its own quota span. Short spans clip text with a
    // full-text tooltip instead of moving another phase to a distant row.
    phaseControls.push({...phase,x,y:phaseY,width:Math.max(1,Math.min(phaseWidth,endX-x-inset)),
      quotaLabel:true,compact,
      options:result.paceChoices});
  }
  const opportunityHeight=Math.max(0,...phaseControls.map(phase=>phase.nextResetOpportunity
    ? resetOpportunityLayout(phase.width).height : 0));
  const labelHeight=Math.max(34,20+(opportunityHeight ? 16+opportunityHeight : 0));
  const centerY=phaseY+labelHeight+labelGap+quotaThickness;
  for(const phase of phaseControls)Object.assign(phase,{labelHeight,quotaAnchorY:centerY-quotaThickness});
  const funnel = quotaFunnelGeometry(result.milestones, { centerY, xAtHours: axis.xAtHours,
    maxThickness:quotaThickness,terminalWidth: 16,restPeriods,shape:'area' });
  // Use the refills actually drawn, including assumed extra resets. A refill
  // at depletion is one event to present, not an additional outage warning.
  const refillTimes=new Set(funnel.refills.filter(refill=>refill.after>0).map(refill=>refill.at));
  const nodes = points.map((point, index) => ({ id: `decision:${index}`, type: 'decision',
    x: axis.xAtHours(point.hours), y: centerY, atHours: point.hours,
    hidden:point.reasons.length===1&&point.reasons[0]==='pace-change'
      &&restPeriods.some(phase=>point.hours>=phase.startHours-1e-6&&point.hours<=phase.endHours+1e-6)}));
  const edges = points.slice(1).map((_, index) => ({ from: `decision:${index}`, to: `decision:${index + 1}`,
    kind: 'continue', path: `M ${nodes[index].x} ${centerY} H ${nodes[index + 1].x}` }));
  const annotations = [];
  const pointIndex = hours => points.findIndex(point => Math.abs(point.hours - hours) < 1e-6);
  const card = (hours, node, kind) => annotations.push({ ...node, anchorX: axis.xAtHours(hours),
    atHours: hours, edgeKind: kind, width: Math.min(compact ? COMPACT_CARD_WIDTH : node.width??190,plotLabelWidth), height: 64,
    from: `decision:${Math.max(0, pointIndex(hours))}` });
  const expires = reset => t('{date} 24:00到期（估算）',{date:reset.expiresOn.slice(5).replace('-', '/')});
  const scenario=result.forecastScenario;
  // Inventory is not a scheduled action. Only actual recommended redemptions
  // receive a dated node and a connector to the quota line.
  const bankedCount=result.resets.length;
  const retainedBanks=result.backupChoices.filter(choice=>!choice.used&&choice.atHours===null);
  const resetActions=[{sequence:1,available:!!forecastFocus&&scenario?.available,
    hours:scenario?.hours,selected:scenario?.selected,onNoReset:scenario?.onNoReset},
    {sequence:2,available:!!forecastFollowing&&scenario?.following?.available,
      ...scenario?.following}];
  for(const action of resetActions.filter(action=>action.available))card(action.hours,{
    id:action.sequence===1 ? 'forecast-assumption' : `forecast-assumption:${action.sequence}`,
    type:'forecast-assumption',sequence:action.sequence,selected:action.selected,width:132,
    ...resetAssumptionContent({...action,locale})
  },action.sequence===1 ? 'reset' : 'reset-second');
  for (const point of points) {
    const forecast = forecastMilestones.find(item => Math.abs(item.hours - point.hours) < 1e-6);
    const afterAssumedReset=scenario?.selected&&point.hours>scenario.hours+1e-6;
    const riskLine = forecast&&!afterAssumedReset ? t(result.flexibleSchedule ? '未额外重置：{percent}%' : '此时仍未额外重置：{percent}%',{percent:round(forecast.noResetProbability*100)}) : null;
    const banks = point.events.filter(event => event.kind === 'backup');
    for (const event of banks) {
      const condition=result.backupChoices.find(choice=>choice.index===event.resetIndex)?.usageCondition;
      const bankRisk=condition ? Number.isFinite(condition.probability)
        ? t('未再 reset：{percent}%',{percent:round(condition.probability*100)}) : null : riskLine;
      card(point.hours, {
      id: `backup:${event.resetIndex}`, type: 'backup', resetIndex: event.resetIndex,
      title: t(condition ? '若耗尽，用备用' : '使用 1 个备用 reset'),
      usageCondition:condition,
      warning: event.deadlineDriven || event.overwrittenPercent > 1e-6,
      lines: [time(event.at),
        event.deadlineDriven ? expires(event) : t('{date}到期',{date:event.expiresOn.slice(5).replace('-', '/')}),
        ...(event.overwrittenPercent > 1e-6 ? [t('提前兑换将覆盖 {percent}%',{percent:round(event.overwrittenPercent)})] : []),
        ...(bankRisk ? [bankRisk] : [])],
      lineTones: ['',event.deadlineDriven ? 'danger' : '',
        ...(event.overwrittenPercent > 1e-6 ? ['danger'] : []),...(bankRisk ? [''] : [])] }, 'backup');
    }
    const bridge = point.events.find(event => event.kind === 'credits-advisory');
    if (bridge) card(point.hours, { id: `credits:${point.hours}`, type: 'credits',
      title:t(banks.length ? '可选：使用 Credits 衔接' : '额度耗尽 · 可用 Credits 衔接'),
      lines: [time(bridge.at),t('消耗需自己预估')] }, 'credits');
    if (point.reasons.includes('depletion') && !bridge && !refillTimes.has(point.at)) card(point.hours, {
      id: `depletion:${point.hours}`, type: 'depletion', title:t('预计耗尽'),
      lines: [time(point.at)] }, 'depletion');
  }
  for(const point of scenario?.selected ? points : [])if(point!==end&&point.events.some(event=>event.kind==='normal-refresh'))
    card(point.hours,{id:`normal:${point.hours}`,type:'normal',title:t('正常刷新'),
      lines:[clock(point.at)]},'normal');
  if (result.milestones.endKind === 'normal-refresh') card(end.hours, {
    id: 'normal-reset', type: 'normal',
    title:t('正常刷新'),
    lines: [time(end.at)] }, 'normal');
  else if(!scenario?.selected)card(end.hours, { id: 'planning-end', type: 'horizon', title:t('后续重新规划'),
    lines: [result.milestones.endKind==='extra-reset' ? t('额外重置后按实际余额重算')
      : t('正常刷新 {time}',{time:time(result.normalResetAt)})] }, 'normal');

  // Both forecast actions share one row. Move their cards horizontally when
  // dates are close; never move the timestamps or split the pair across rows.
  const rows = [];
  const annotationHeight=node=>32+(node.lines.length+(node.type==='forecast-assumption'&&node.selected ? 1 : 0))*16;
  const rowHeight = Math.max(64,...annotations.map(annotationHeight)) + 19;
  let height = centerY + 90;
  const placeAnnotation=(annotation,x,row)=>{
    (rows[row]??=[]).push({left:x,right:x+annotation.width});
    const node = { ...annotation, x, y: centerY + 70 + row * rowHeight,
      height: annotationHeight(annotation) };
    nodes.push(node);
    const middle = node.y + node.height / 2;
    const turn = node.x >= node.anchorX ? 8 : -8;
    edges.push({ from: node.from, to: node.id, kind: node.edgeKind,
      path: `M ${node.anchorX} ${centerY} V ${middle - 8} Q ${node.anchorX} ${middle} ${node.anchorX + turn} ${middle} H ${node.x}` });
    height = Math.max(height, node.y + node.height + 20);
  };
  const assumptions=annotations.filter(node=>node.type==='forecast-assumption').sort((a,b)=>a.sequence-b.sequence);
  if(assumptions.length) {
    const gap=16,right=axis.width-4;
    const maxWidth=Math.max(1,(axis.width-8-gap*(assumptions.length-1))/assumptions.length);
    const cards=assumptions.map(node=>({...node,width:Math.min(node.width,maxWidth)}));
    const totalWidth=cards.reduce((sum,node)=>sum+node.width,0)+gap*(cards.length-1);
    // Below the quota lane its empty left gutter can accommodate the pair on
    // narrow screens, without imposing a minimum width on the whole graph.
    const left=Math.max(0,Math.min(axis.leftPadding,right-totalWidth));
    let cursor=left;
    const positions=cards.map(node=>{
      const x=Math.max(cursor,Math.min(right-node.width,node.anchorX+9));
      cursor=x+node.width+gap;
      return x;
    });
    cursor=right;
    for(let index=cards.length-1;index>=0;index--) {
      positions[index]=Math.min(positions[index],cursor-cards[index].width);
      cursor=positions[index]-gap;
    }
    cards.forEach((node,index)=>placeAnnotation(node,positions[index],0));
  }
  // Other event cards avoid the reserved pair as well as each other.
  for(const annotation of annotations.filter(node=>node.type!=='forecast-assumption').sort((a,b)=>a.atHours-b.atHours)) {
    const x=clamp(annotation.anchorX+9,annotation.width);
    let row=rows.findIndex(ranges=>ranges.every(range=>range.right+16<=x||x+annotation.width+16<=range.left));
    if(row<0)row=rows.length;
    placeAnnotation(annotation,x,row);
  }
  const gutterWidth=Math.max(0,axis.leftPadding-16);
  const resetLaneLabels=[probabilityPlot,followingPlot].map((plot,index)=>plot ? {
    id:`reset-${index+1}`,...(compact ? {x:axis.leftPadding,y:plot.topY-62,width:plotLabelWidth,height:18}
      : {x:0,y:plot.topY+plot.height/2-10,width:gutterWidth,height:20}),inline:true,
    title:t(index===0 ? '首次额外重置' : '第二次额外重置'),detail:'',
    tooltip:[t(index===0 ? '首次额外重置预测' : '第二次额外重置预测'),t('概率密度'),
      index===1 ? t('以首次发生为前提') : ''].filter(Boolean).join(' · ')} : null);
  const suggested=shownPhases.some(phase=>!phase.fixed&&!phase.constrained&&phase.reason!=='no-resource'
    &&Math.abs(phase.dailyPercent-phase.baselineDailyPercent)>1e-5);
  const headings = compact ? [{x:axis.leftPadding,y:phaseY-22,width:plotLabelWidth,height:18,kind:'usage',inline:true,
    date:[t(suggested ? '建议 / 天' : '用量 / 天'),...(opportunityHeight ? [t('重置概率 · 截至')] : [])].join(' · '),state:''}]
    : [{x:0,y:phaseY,width:gutterWidth,height:20,kind:'usage',inline:true,
    date:t(gutterWidth<160 ? suggested ? '建议 / 天' : '用量 / 天' : suggested ? '建议用量 / 天' : '日均用量'),state:''},
    ...(opportunityHeight ? [{x:0,y:phaseY+36,width:gutterWidth,height:opportunityHeight,kind:'opportunity',
      inline:true,date:t('重置概率 · 截至'),state:'',tooltip:t('固定日期之前至少发生一次额外重置的累计概率')}] : []),
    {x:0,y:centerY-quotaThickness/2-10,width:gutterWidth,height:20,kind:'consumption',inline:true,
    date:t('剩余额度'),state:''}];
  return { compact,nodes, edges, headings, controls: [], phaseControls,bankedCount,retainedBanks, compactForecast: result.flexibleSchedule,
    width: axis.width, height,
    levels: strategyTreeView(result), displayLevels: strategyMilestoneView(result), funnel,
    locale,timeZone: result.timeZone,resetLaneLabels, forecastCalendar: result.forecastCalendar,
    forecastLayout, forecastFocus, forecastFollowing,forecastPeaks, probabilityPlot,followingPlot,followingPeaks, forecastScenario:scenario,
    dayAxis: { days: axis.days, labels:dateLabels,endHours:displayEndHours, dayWidth: axis.dayWidth, nowX: axis.nowX,
      leftPadding:axis.leftPadding,rightPadding:axis.padding,
      centerY,quotaTopY:centerY-quotaThickness, forecastY: headingY - 8, gridTop: 28, gridBottom: centerY + 39 } };
}
