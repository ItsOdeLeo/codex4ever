import { translator,uiLocale } from './ui-language.js';
import { strategyTreeView, strategyMilestoneView } from './strategy-tree-view.js';
import { quotaFunnelGeometry } from './strategy-quota-funnel.js';
import { layoutTimeStrategy } from './strategy-time-layout.js';
import { renderResetElement } from './components/reset-element.js';
import { renderPhaseControl, renderStrategyNode } from './components/strategy-annotations.js';
import { renderTimelineLaneLabel } from './components/timeline-lane-label.js';

const STAGE = 405;
const MID = 216;
const round = value => Number(value.toFixed(1));

/** Event-scale policy with forecast annotations and selectable alternatives.
 * Cumulative forecast labels are not stochastic branch probabilities. */
export function layoutStrategyTree(result, { expandedLevel = 0, showAll = false, prediction = null, viewportWidth,displayEndHours,locale='zh-CN' } = {}) {
  if (result.paceChoices) return layoutTimeStrategy(result, { prediction,viewportWidth,displayEndHours,locale });
  const levels = strategyTreeView(result);
  const displayLevels = strategyMilestoneView(result);
  const time = value => new Intl.DateTimeFormat('zh-CN', { timeZone: result.timeZone,
    month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value));
  const nodes = [], edges = [], headings = [], controls = [];
  const link = (from, to, kind, label = '') => edges.push({ from, to, kind, label });
  let height = 300;
  const actionNode = (item, level, x, y, selected) => {
    const direction = item.action.multiplier === 0 ? '暂停'
      : item.action.multiplier < result.startingPoint.multiplier - 1e-6 ? '少用'
        : item.action.multiplier > result.startingPoint.multiplier + 1e-6 ? '多用' : '按起点用';
    const usedPercent = round(item.outcome.usedDays * result.averagePercentPerDay);
    const title = item.action.id.startsWith('use-before-') ? `先用完当前 ${round(level.state.quota)}% 额度`
      : `${direction}${item.action.multiplier ? ` · 日均约 ${item.dailyPercent}% 额度` : ''}`;
    const lines = [item.action.id.startsWith('use-before-') ? `${level.until}前完成 · 剩 ${round(item.outcome.remainingAfter)}%`
      : `这段用约 ${usedPercent}% · 剩 ${round(item.outcome.remainingAfter)}%`,
      selected ? item.outcome.pauseHours > 1e-6 ? `这段需停用 ${round(item.outcome.pauseHours)} 小时`
        : `备用 ${item.outcome.resetsRemaining} · Credits ${round(item.outcome.creditsRemaining)}`
        : item.fallbackText];
    if (selected && item.outcome.pauseHours < 1e-6) lines[1] = level.endDescription;
    if (selected && result.paceChoices) {
      lines.splice(0, lines.length, level.endDescription);
    }
    return { id: `${level.index}:${item.id}`, type: selected ? 'selected' : 'alternative',
      x, y, width: 254, height: 66,
      title: selected && result.paceChoices ? item.action.multiplier ? `日均约用 ${item.dailyPercent}%` : '暂停使用' : title,
      lines, actionId: item.id, level: level.sourceLevelIndex,
      canChoose: level.canChoose && level.actions.length > 1,
      recommended: item.recommended, events: item.events };
  };
  for (const level of displayLevels) {
    const x = level.index * STAGE;
    const decision = { id: `decision:${level.index}`, type: 'decision', x: x + 16, y: MID };
    const action = actionNode(level.selected, level, x + 45, MID - 92, true);
    const chance = { id: `chance:${level.index}`, type: 'chance', x: x + STAGE + 16, y: MID };
    nodes.push(decision, action, chance);
    headings.push({ x: x + 45, y: 80, date: level.date,
      state: `额度 ${round(level.state.quota)}% · 备用 ${level.state.resets}`,
      until: level.until });
    link(decision.id, action.id, 'selected');
    link(action.id, chance.id, 'selected');
    if (!result.forecastCalendar && level.cumulativeResetProbability > 1e-8) {
      const reset = { id: `reset:${level.index}`, type: 'reset', x: chance.x - 85, y: 9,
        width: 170, height: 64, title: `此前额外重置概率 ${round(level.cumulativeResetProbability * 100)}%`,
        probabilityKind: 'cumulative-from-plan-start',
        probability: level.cumulativeResetProbability,
        lines: [level.until, '从现在累计；发生就重算'] };
      nodes.push(reset);
      link(chance.id, reset.id, 'reset');
    }
    const last = level.index === displayLevels.length - 1;
    if (!last || result.milestones.endKind === 'normal-refresh') {
      const label = result.predictionEnabled ? '仍未重置' : '继续';
      if (!last) link(chance.id, `decision:${level.index + 1}`, 'continue', label);
      else {
        const terminal = { id: 'normal-reset', type: 'normal', x: x + 430, y: MID - 92,
          width: 195, height: 66, title: '正常刷新',
          lines: [level.until] };
        nodes.push(terminal);
        link(chance.id, terminal.id, 'continue', label);
      }
    }
    if (last && result.milestones.endKind === 'planning-horizon') {
      const terminal = { id: 'planning-end', type: 'horizon', x: x + 430, y: MID - 92,
        width: 195, height: 66, title: '后续重新规划',
        lines: [`正常刷新 ${time(result.normalResetAt)}`] };
      nodes.push(terminal);
      link(chance.id, terminal.id, 'continue');
    }
    let resourceCount = 0;
    for (const event of level.selected.outcome.events.filter(event => event.kind === 'backup')) {
      const backup = { id: `backup:${level.index}:${resourceCount}`, type: 'backup',
        x: x + 45, y: 307 + resourceCount * 83, width: 190, height: 64,
        title: '使用 1 个备用 reset',
        resetIndex: result.paceChoices ? event.resetIndex : undefined,
        lines: [time(event.at),
          `${event.expiresOn.slice(5).replace('-', '/')}到期`,
          ...(event.overwrittenPercent > 1e-6 ? [`提前兑换将覆盖 ${round(event.overwrittenPercent)}%`] : [])] };
      nodes.push(backup);
      link(decision.id, backup.id, 'backup');
      edges.at(-1).lane = resourceCount++;
      height = Math.max(height, backup.y + backup.height + 24);
    }
    if (level.creditsBridge) {
      const bridge = level.creditsBridge;
      const credits = { id: `credits:${level.index}`, type: 'credits',
        x: x + 45, y: 307 + resourceCount * 83, width: 190, height: 64,
        title: '可选：使用 Credits 衔接', lines: [time(bridge.at), '消耗需自己预估'] };
      nodes.push(credits);
      link(decision.id, credits.id, 'credits');
      edges.at(-1).lane = resourceCount++;
      height = Math.max(height, credits.y + credits.height + 24);
    }
    const expanded = expandedLevel === level.sourceLevelIndex;
    if (!level.canChoose || level.actions.length < 2) continue;
    controls.push({ level: level.sourceLevelIndex, x: x + 45, y: 271, expanded, kind: 'compare' });
    if (!expanded) continue;
    const alternatives = level.actions.filter(item => item.id !== level.selectedActionId);
    const priority = [];
    for (const category of ['bank-now', 'credits', 'deadline', 'hold', 'pause']) {
      const item = alternatives.find(item => item.category === category && !priority.includes(item));
      if (item) priority.push(item);
    }
    for (const item of alternatives) if (!priority.includes(item)) priority.push(item);
    const shown = showAll ? priority : priority.slice(0, 3);
    const alternativesTop = 307 + resourceCount * 83;
    shown.forEach((item, index) => {
      // Alternatives change the next solver period, then optimize again. A
      // merged selected phase must not extend their deadline to its own end.
      const alternative = actionNode(item, { ...level, until: levels[level.sourceLevelIndex].until },
        x + 45, alternativesTop + index * 83, false);
      nodes.push(alternative);
      link(decision.id, alternative.id, 'alternative');
      height = Math.max(height, alternative.y + alternative.height + 24);
    });
    if (shown.length < alternatives.length) {
      const y = alternativesTop + shown.length * 83;
      controls.push({ level: level.sourceLevelIndex, x: x + 45, y, kind: 'more',
        count: alternatives.length - shown.length });
      height = Math.max(height, y + 38);
    }
  }
  const offsetY = nodes.some(node => node.type === 'reset') ? 0 : -70;
  const funnel = quotaFunnelGeometry(result.milestones, {
    startX: 16, stageWidth: STAGE, centerY: MID + offsetY });
  if (offsetY) {
    for (const node of nodes) node.y -= 70;
    for (const heading of headings) heading.y -= 70;
    for (const control of controls) control.y -= 70;
    height -= 70;
  }
  const byId = new Map(nodes.map(node => [node.id, node]));
  for (const edge of edges) {
    const from = byId.get(edge.from), to = byId.get(edge.to);
    if (!from || !to) throw new Error('策略树连接缺少端点');
    const start = { x: from.x + (from.width ?? 0),
      y: from.type === 'selected' ? MID + offsetY : from.y + (from.height ?? 0) / 2 };
    const end = { x: to.x,
      y: ['selected', 'normal'].includes(to.type) ? MID + offsetY : to.y + (to.height ?? 0) / 2 };
    if (edge.kind === 'reset') {
      end.x += to.width / 2; end.y = to.y + to.height;
      edge.path = `M ${start.x} ${start.y} V ${end.y}`;
    } else if (edge.kind === 'backup' || edge.kind === 'credits') {
      const laneX = start.x - edge.lane * 6;
      edge.path = `M ${start.x} ${start.y} H ${laneX} V ${end.y - 9} Q ${laneX} ${end.y} ${laneX + 9} ${end.y} H ${end.x}`;
    } else if (edge.kind === 'alternative') {
      edge.path = `M ${start.x} ${start.y} V ${end.y - 9} Q ${start.x} ${end.y} ${start.x + 9} ${end.y} H ${end.x}`;
    } else edge.path = `M ${start.x} ${start.y} H ${end.x}`;
    edge.labelX = (start.x + end.x) / 2;
    edge.labelY = start.y - 10;
  }
  return { nodes, edges, headings, controls, width: displayLevels.length * STAGE + 240,
    height, levels, displayLevels, funnel, forecastCalendar: result.forecastCalendar,
    timeZone: result.timeZone,bankedCount:result.resets?.length??0 };
}

export function renderStrategyTree(graph, escape) {
  const locale=graph.locale??'zh-CN',t=translator(locale);
  const resetActionIds=new Set(graph.nodes.filter(node=>node.type==='forecast-assumption').map(node=>node.id));
  // Quota figures never overlap: a short span keeps only what fits, left to
  // right, so a refill right after a pace change does not print two numbers.
  const shownQuotaLabels=new Set();
  let lastRight=-Infinity;
  for(const label of graph.funnel.bands.flatMap(band=>band.labels.filter((label,index)=>
    !graph.dayAxis||index===0||band.x2-band.x1>=70).map(label=>({label,width:`${round(label.quota)}%`.length*7+4})))
    .sort((a,b)=>(a.label.anchor==='end' ? a.label.x-a.width : a.label.x)-(b.label.anchor==='end' ? b.label.x-b.width : b.label.x))) {
    const left=label.label.anchor==='end' ? label.label.x-label.width : label.label.x;
    if(left<lastRight+4)continue;
    shownQuotaLabels.add(label.label);lastRight=left+label.width;
  }
  const resetElements=[
    {sequence:1,plot:graph.probabilityPlot,focus:graph.forecastFocus,peaks:graph.forecastPeaks??[]},
    {sequence:2,plot:graph.followingPlot,focus:graph.forecastFollowing,peaks:graph.followingPeaks??[]}
  ].map(props=>({...props,action:graph.nodes.find(node=>node.type==='forecast-assumption'&&(node.sequence??1)===props.sequence),
    refills:graph.funnel.refills.filter(refill=>refill.kind==='assumed-extra'&&(refill.sequence??1)===props.sequence)}))
    .filter(props=>props.plot||props.focus||props.action||props.refills.length)
    .map(props=>renderResetElement({...props,
      connectors:graph.edges.filter(edge=>edge.to===props.action?.id),
      guideEndY:graph.dayAxis?.quotaTopY!==undefined ? graph.dayAxis.quotaTopY-8 : graph.dayAxis?.centerY-32,timeZone:graph.timeZone,locale,
      laneLabel:graph.resetLaneLabels?.[props.sequence-1]},escape));
  const svg = `<svg class="tree-edges" width="${graph.width}" height="${graph.height}" aria-hidden="true">
    <defs><linearGradient id="quota-fill" x1="0" y1="0" x2="0" y2="1"><stop class="quota-fill-start" offset="0%"/><stop class="quota-fill-end" offset="100%"/></linearGradient></defs>
    ${graph.dayAxis ? graph.dayAxis.days.filter((_,index)=>index%2).map(day => `<rect class="time-day-band" x="${day.x}" y="${graph.dayAxis.gridTop}" width="${graph.dayAxis.dayWidth}" height="${graph.dayAxis.gridBottom-graph.dayAxis.gridTop}"/>`).join('') : ''}
    ${graph.dayAxis ? [...graph.dayAxis.days.map(day => day.x), graph.dayAxis.days.at(-1).x + graph.dayAxis.dayWidth].map(x => `<path class="time-grid-line" d="M ${x} ${graph.dayAxis.gridTop} V ${graph.dayAxis.gridBottom}"/>`).join('') : ''}
    ${resetElements.map(element=>element.svg).join('')}
    ${!graph.compactForecast && graph.forecastLayout?.length ? `<path class="time-forecast-line" d="M ${graph.forecastLayout[0].x} ${graph.dayAxis.forecastY} H ${graph.forecastLayout.at(-1).x}"/>${graph.forecastLayout.map(point => `<circle class="time-forecast-point" cx="${point.x}" cy="${graph.dayAxis.forecastY}" r="2.5"/>`).join('')}` : ''}
    ${graph.funnel.bands.map(band => `<g class="quota-phase${band.kind==='assumed-refresh' ? ' quota-phase-assumed' : ''}"${band.kind==='rest' ? ' data-quota-rest' : ''} data-start-quota="${band.startQuota}" data-end-quota="${band.endQuota}">
      <path class="quota-baseline${band.kind === 'pause' ? ' quota-paused-line' : band.kind==='rest' ? ' quota-rest-line' : ''}" d="${band.baseline}"/>
      ${band.kind==='rest' ? '' : `<path class="quota-band quota-${band.kind}" d="${band.path}"/>`}
      ${band.labels.filter(label => shownQuotaLabels.has(label)).map(label => `<text class="quota-label" x="${label.x}" y="${label.y}" text-anchor="${label.anchor}">${round(label.quota)}%</text>`).join('')}
    </g>`).join('')}
    ${graph.edges.filter(edge => !['selected', 'continue'].includes(edge.kind)&&!resetActionIds.has(edge.to)).map(edge => `<path class="edge-${edge.kind}" d="${edge.path}"/>`).join('')}
    ${graph.funnel.refills.filter(refill=>refill.kind!=='assumed-extra').map(refill => `<path class="quota-refill quota-refill-${refill.kind}" data-refill-sequence="${refill.sequence??0}" d="${refill.path}"/>`).join('')}
    ${resetElements.map(element=>element.overlaySvg).join('')}
    ${graph.nodes.filter(node => !node.hidden&&['decision', 'chance'].includes(node.type)).map(node => `<circle class="point-${node.type}" cx="${node.x}" cy="${node.y}" r="${node.type === 'decision' ? 4 : 3}"/>`).join('')}
  </svg>`;
  const headings = graph.headings.map(item => ['consumption','usage','opportunity'].includes(item.kind)
    ? renderTimelineLaneLabel({...item,id:item.kind,title:item.date,detail:item.state,note:item.unit},escape)
    : `<div class="graph-day" style="left:${item.x}px;top:${item.y}px;width:${item.width ?? 254}px"><strong>${escape(item.date)}</strong>${item.state ? `<span>${escape(item.state)}</span>` : ''}</div>`).join('');
  const days = graph.dayAxis ? (graph.dayAxis.labels??graph.dayAxis.days).map(day => `<div class="time-day" style="left:${day.x}px;width:${day.width}px">${escape(uiLocale(locale)==='zh-CN' ? day.label : new Intl.DateTimeFormat(uiLocale(locale),{timeZone:graph.timeZone,month:'short',day:'numeric'}).format(new Date(Date.parse(day.startAt)+3600000)))}</div>`).join('') : '';
  const alignedForecast = graph.forecastLayout?.length ? `<div class="forecast-calendar forecast-aligned" aria-label="${t('固定日期之前至少发生一次额外重置的累计概率')}">${graph.forecastLayout.map(point => `<span ${point.calendar ? 'data-forecast-at' : 'data-event-forecast-at'}="${escape(point.at)}" data-probability="${point.probability}" title="${escape(t('截至 {time} 至少发生一次额外 reset',{time:point.at}))}" style="left:${point.left}px;top:${point.y}px;width:${point.width}px">${graph.probabilityPlot ? '' : `<small>${escape(point.label)}</small>`}<strong>${graph.probabilityPlot ? t('累计')+' ' : graph.compactForecast ? t('额外重置')+' ' : ''}${round(point.probability * 100)}%</strong></span>`).join('')}</div>` : '';
  const nodes = graph.nodes.filter(node => node.width&&node.type!=='forecast-assumption')
    .map(node=>renderStrategyNode(node,escape,locale)).join('');
  const controls = graph.controls.map(control => `<button type="button" class="graph-control" ${control.kind === 'compare' ? `data-inspect-level="${control.level}" aria-expanded="${control.expanded}"` : 'data-show-all-actions'} style="left:${control.x}px;top:${control.y}px">${control.kind === 'compare' ? t(control.expanded ? '− 收起其他做法' : '＋ 比较这一步') : t('＋ 其他 {count} 种做法',{count:control.count})}</button>`).join('');
  const phaseControls = (graph.phaseControls ?? []).map(phase=>renderPhaseControl(phase,{
    firstPhaseIndex:graph.phaseControls[0]?.phaseIndex,scenarioSelected:graph.forecastScenario?.selected,
    timeZone:graph.timeZone,escape,locale})).join('');
  const forecastDate = value => {
    const instant = new Date(value);
    const clock = new Intl.DateTimeFormat('en-GB', {timeZone: graph.timeZone,
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(instant);
    if (clock === '00:00') return `${new Intl.DateTimeFormat('zh-CN', {timeZone: graph.timeZone,
      month: 'numeric', day: 'numeric'}).format(new Date(instant.getTime() - 1))}结束`;
    return new Intl.DateTimeFormat('zh-CN', {timeZone: graph.timeZone,
      month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(instant);
  };
  const forecast = !graph.dayAxis && graph.forecastCalendar?.length ? `<div class="forecast-calendar" aria-label="${t('固定日期之前至少发生一次额外重置的累计概率')}">
    <span>此前额外重置概率</span><div>${graph.forecastCalendar.map(point => `<span><small>${escape(forecastDate(point.at))}</small><strong>${round(point.probability * 100)}%</strong></span>`).join('')}</div></div>` : '';
  const forecastLegend = !graph.compactForecast && graph.forecastLayout?.length
    ? `<div class="forecast-legend">${t('蓝线：此前至少发生一次额外 reset 的概率')}</div>` : '';
  const inventory=graph.bankedCount>0 ? `<div class="retained-resets" data-banked-count="${graph.bankedCount}">${escape(t('备用 reset · {count} 个',{count:graph.bankedCount}))}</div>` : '';
  return `${forecast}${forecastLegend}<div class="tree-scroll" data-timeline-orientation="horizontal" tabindex="0" role="region" aria-label="${t('从左向右的额度漏斗与策略选择，可横向滚动')}"><div class="strategy-graph"${graph.compact ? ' data-compact' : ''} style="width:${graph.width}px;height:${graph.height}px" ${graph.dayAxis ? `data-timeline-from="${graph.dayAxis.days[0].startAt}" data-timeline-to="${graph.dayAxis.days.at(-1).endAt}"` : ''}>${svg}${days}${alignedForecast}${resetElements.map(element=>element.html).join('')}${headings}${phaseControls}${nodes}${controls}</div></div>${inventory}`;
}
