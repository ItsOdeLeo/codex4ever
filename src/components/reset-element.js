import { translator,uiLocale } from '../ui-language.js';
import { renderTimelineLaneLabel } from './timeline-lane-label.js';
const round=value=>Number(value.toFixed(1));
const probability=value=>value>0&&value<.0001 ? '&lt;0.01' : round(value*100);
const name=(sequence,locale)=>translator(locale)(sequence===1 ? '首次' : '第二次');
const position=({left,x,y,width,height,viewportWidth})=>`data-reset-position style="--reset-left:${viewportWidth ? `${(left??x)/viewportWidth*100}%` : `${left??x}px`};--reset-top:${y}px;--reset-width:${viewportWidth ? `${width/viewportWidth*100}%` : `${width}px`};--reset-height:${height??0}px"`;

export function resetOpportunityLayout(width=Infinity) {
  const stacked=width<80;
  return {stacked,height:stacked ? 48 : 32};
}

export function renderResetOpportunity(opportunity,{timeZone,escape,locale='zh-CN',compact=false,width=Infinity,dateOnly=false}) {
  const t=translator(locale);
  if(!opportunity)return '';
  const time=new Intl.DateTimeFormat(uiLocale(locale),{timeZone,month:uiLocale(locale)==='zh-CN' ? 'numeric' : 'short',
    day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  const until=time.format(new Date(opportunity.until));
  const sequence=Math.max(1,Math.trunc(Number(opportunity.nextExtraResetSequence))||1);
  const fullLabel=t('至少一次额外重置：{percent}%',{percent:probability(opportunity.probability)});
  const layout=resetOpportunityLayout(width);
  const day=compact ? new Intl.DateTimeFormat(uiLocale(locale),{timeZone,month:'2-digit',day:'2-digit'}).format(new Date(opportunity.until)) : null;
  const clock=compact ? new Intl.DateTimeFormat('en-GB',{timeZone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(opportunity.until)) : null;
  const content=compact ? `<span class="phase-probability-value">${probability(opportunity.probability)}%</span><span class="phase-probability-until"><time datetime="${escape(opportunity.until)}"><span>${escape(day)}</span>${dateOnly ? '' : ` <span>${escape(clock)}</span>`}</time></span>`
    : `<span>${fullLabel}</span><span class="phase-probability-until">${escape(t('{time}之前',{time:until}))}</span>`;
  return `<small class="reset-element phase-reset-opportunity" data-reset-element="${sequence>=2 ? 2 : 1}" data-reset-opportunity data-next-extra-sequence="${sequence}" data-probability="${opportunity.probability}" ${compact ? `data-compact-probability data-cutoff-layout="${layout.stacked ? 'stacked' : 'inline'}"` : ''} title="${escape(fullLabel+' · '+t('截至 {time}；以本段开始前未再发生额外reset为条件{renewal}',{time:until,renewal:opportunity.previousExtraResetAt ? t('，从最近选择的额外reset重新计时') : ''}))}">${content}</small>`;
}

// One state definition feeds both layouts and the single action template.
const resetActionCopy={
  1:{idle:'计入首次 reset',selected:'已计入首次 reset',cancelHint:'取消首次及后继假设'},
  2:{idle:'计入两次 reset',selected:'已计入第二次 reset',cancelHint:'取消第二次假设，保留首次'}
};
function resetAssumptionState({sequence,selected,locale='zh-CN'}) {
  const t=translator(locale);
  const copy=resetActionCopy[sequence===2 ? 2 : 1];
  return {title:t(selected ? copy.selected : copy.idle),lines:[],
    hint:t(selected ? copy.cancelHint : copy.idle),cancel:selected ? t('不计入') : ''};
}

/** Compatible layout metadata, derived from the same button-state definition. */
export function resetAssumptionContent(props) {
  const {title,lines}=resetAssumptionState(props);
  return {title,lines};
}

function renderMode({sequence,focus,plot,vertical=false,escape,locale}) {
  const t=translator(locale);
  if(!focus)return '';
  const data=sequence===1
    ? `data-reset-estimate="${escape(focus.pointAt)}" data-estimate-cdf="${focus.cumulativeProbability}" data-estimate-probability="${focus.probability}"`
    : `data-reset-sequence="2" data-reset-at="${escape(focus.pointAt)}" data-conditional-on="${escape(focus.conditionalOn)}"`;
  if(!plot&&sequence===1&&!vertical) {
    const mode=['maximum-hour-window-mass','maximum-hour-window-density'].includes(focus.method);
    return `<div class="forecast-mode" ${data} ${position(focus)} title="${t(mode ? '标线对应概率分布的最高峰。' : '上次reset加近期平均间隔，再校准到常见发布钟点的参考时间。')}${t('左右为估计范围之外的概率。')}"><span data-estimate-earlier="${focus.earlierProbability}">${t('← 更早 {percent}%',{percent:round(focus.earlierProbability*100)})}</span><strong>${t(mode ? '最可能额外 reset' : '预计额外 reset')}<small>${escape(focus.label)}</small></strong><span data-estimate-later="${focus.laterProbability}">${t('更晚 {percent}% →',{percent:round(focus.laterProbability*100)})}</span></div>`;
  }
  if(focus.announced)return `<div class="forecast-mode forecast-mode-on-plot" ${data} data-reset-announced data-reset-marker ${position(focus)} aria-label="${t('已宣布的 reset')} · ${escape(focus.label)}"><strong>${escape(focus.label)}<small>${t('已宣布')}</small></strong></div>`;
  const className=sequence===1 ? 'forecast-mode forecast-mode-on-plot' : 'forecast-following';
  return `<div class="${className}" ${data} data-reset-marker ${position(focus)} aria-label="${name(sequence,locale)} ${t(focus.planned ? '规划时刻' : '最可能')} reset · ${escape(focus.label)}" title="${t(focus.planned ? '标线是规划计入这次 reset 的保守时刻：正常刷新前可能发生的部分，有 75% 在此之前。' : '标线对应本条分布最高峰。')}${sequence===2 ? t('第二次以首次在预测点发生为前提。') : ''}"><strong>${escape(focus.planned ? focus.label : `${t('最可能')} ${focus.clockLabel??focus.label}`)}<small>${t('累计')} ${probability(focus.cumulativeProbability)}%</small></strong></div>`;
}

function renderAction(action,escape,locale) {
  if(!action)return '';
  const sequence=action.sequence??1;
  const state=resetAssumptionState({sequence,selected:action.selected,locale});
  return `<button type="button" class="graph-node graph-forecast-assumption" data-node-id="${escape(action.id)}" data-assume-reset aria-pressed="${action.selected}" data-assumption-sequence="${sequence}" title="${escape(state.hint)}" ${position(action)}><span class="reset-action-heading"><strong>${escape(action.title??state.title)}</strong>${state.cancel ? `<small class="reset-action-cancel">${escape(state.cancel)}</small>` : ''}</span>${(action.lines??state.lines).map(line=>`<span>${escape(line)}</span>`).join('')}</button>`;
}

/** Reusable reset element. Receives solved geometry/probabilities; never
 * estimates time, changes quota, or reads page state. The same element owns
 * curve, peak labels, mode, guide, action, connector and assumed refill. */
export function renderResetElement({sequence=1,plot=null,focus=null,peaks=[],action=null,
  connectors=[],refills=[],guideEndY,orientation='horizontal',guideStartX,captionPosition,
  timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone,locale='zh-CN',laneLabel=null},escape) {
  const t=translator(locale);
  const vertical=orientation==='vertical';
  const date=new Intl.DateTimeFormat(uiLocale(locale),{timeZone,month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  const plotSvg=plot&&!plot.announced ? `<g class="reset-density-series" data-density-sequence="${sequence}" data-reset-density-plot data-cumulative-probability="${plot.cumulativeProbability}" data-tail-probability="${plot.tailProbability}"><path class="reset-density-baseline" d="M ${plot.startX} ${plot.bottomY} H ${plot.endX}"/><path class="reset-density-area" d="${plot.areaPath}"/><path class="reset-density-line" d="${plot.densityPath}"/>${plot.bins.map(bin=>`<rect class="reset-density-hit" x="${bin.x1}" y="${plot.topY}" width="${bin.x2-bin.x1}" height="${plot.height}" data-bin-probability="${bin.probability}" data-bin-cdf="${bin.cumulativeProbability}"><title>${t(sequence===2 ? '第二次（假设首次发生）' : '首次')} reset · ${escape(date.format(new Date(bin.endAt)))} · ${t('累计')} ${probability(bin.cumulativeProbability)}%</title></rect>`).join('')}</g>` : '';
  const peakSvg=peaks.map(peak=>vertical
    ? `<path class="reset-peak-leader" d="M ${peak.curveX+4} ${peak.timeY} H ${peak.left-2}"/><circle class="reset-peak-point" cx="${peak.curveX}" cy="${peak.timeY}" r="2.5"/>`
    : `<path class="reset-peak-leader" d="M ${peak.x} ${peak.curveY-4} V ${peak.y+peak.height}"/><circle class="reset-peak-point" cx="${peak.x}" cy="${peak.curveY}" r="2.5"/>`).join('');
  const guide=focus ? vertical
    ? `<path class="${sequence===1 ? 'forecast-mode-guide' : 'forecast-following-guide'}" d="M ${guideStartX} ${focus.x} H ${plot?.bottomY??guideStartX}"/><circle class="${sequence===1 ? 'forecast-mode-point' : 'forecast-following-point'}" cx="${plot?.topY??guideStartX}" cy="${focus.x}" r="3.5"/>`
    : plot||sequence===2
    ? `<path class="${sequence===1 ? 'forecast-mode-guide' : 'forecast-following-guide'}" d="M ${focus.x} ${plot ? plot.topY-4 : focus.y+38} V ${guideEndY}"/><circle class="${sequence===1 ? 'forecast-mode-point' : 'forecast-following-point'}" cx="${focus.x}" cy="${plot ? plot.topY : focus.y+38}" r="3.5"/>`
    : `<path class="forecast-mode-range" d="M ${focus.fromX} ${focus.y+66} H ${focus.toX}"/><path class="forecast-mode-guide" d="M ${focus.left+focus.width/2} ${focus.y+61} L ${focus.x} ${focus.y+74} V ${guideEndY}"/>` : '';
  const tailLabel=plot&&!plot.announced&&plot.tailProbability>=.01 ? t('范围外 {percent}%',{percent:probability(plot.tailProbability)}) : '';
  const caption=laneLabel ? renderTimelineLaneLabel({...laneLabel,
    tooltip:[laneLabel.tooltip,t(sequence===2 ? '以首次在标记时刻发生为条件。' : '首次额外reset的概率分布。'),tailLabel].filter(Boolean).join(' ')},escape)
    : plot ? `<div class="reset-density-caption" ${position(captionPosition??{left:plot.startX,y:plot.topY-62,width:plot.endX-plot.startX})} title="${t(sequence===2 ? '以首次在标记时刻发生为条件。' : '首次额外reset的概率分布。')}${tailLabel}"><span>${vertical ? `${name(sequence,locale)} reset` : `${name(sequence,locale)}${uiLocale(locale)==='zh-CN' ? '' : ' '}${t('额外 reset')} · ${sequence===2 ? `<span class="reset-caption-condition">${t('假设首次发生')}</span>` : t('概率分布')}`}</span>${vertical ? `<span>${t(sequence===2 ? '首次发生后' : '概率分布')}</span>` : tailLabel ? `<span>${tailLabel}</span>` : ''}</div>` : '';
  const labels=peaks.map(peak=>`<div class="reset-peak-cdf" data-forecast-peak-at="${escape(peak.at)}" data-peak-sequence="${sequence}" data-probability="${peak.cumulativeProbability}" ${position(peak)} title="${escape(date.format(new Date(peak.at)))} · ${t(sequence===2 ? '以首次发生为前提的第二次累计概率' : '首次额外reset累计概率')}">${t('累计')}${vertical ? `<small>${probability(peak.cumulativeProbability)}%</small>` : ` ${probability(peak.cumulativeProbability)}%`}</div>`).join('');
  const connectionSvg=connectors.map(edge=>`<path class="reset-action-connection edge-${edge.kind}" d="${edge.path}"/>`).join('');
  const refillSvg=refills.map(refill=>`<path class="quota-refill quota-refill-assumed-extra${sequence===2 ? ' quota-refill-sequence-2' : ''}" data-refill-sequence="${sequence}" d="${refill.path}"/>`).join('');
  const state=action?.selected ? 'assumed' : 'forecast';
  const attributes=`class="reset-element" data-reset-element="${sequence}" data-reset-state="${state}"${vertical ? ' data-reset-orientation="vertical"' : ''}`;
  return {svg:`<g ${attributes}>${vertical ? `<g transform="matrix(0 1 1 0 0 0)">${plotSvg}</g>` : plotSvg}${peakSvg}${guide}</g>`,
    overlaySvg:`<g ${attributes}>${connectionSvg}${refillSvg}</g>`,
    html:`<div ${attributes}>${caption}${labels}${renderMode({sequence,focus,plot,vertical,escape,locale})}${renderAction(action,escape,locale)}</div>`};
}
