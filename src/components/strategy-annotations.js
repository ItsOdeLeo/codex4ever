import { usageRateAdvice, usageRateDetail } from '../usage-rate-label.js';
import { renderResetOpportunity,resetOpportunityLayout } from './reset-element.js';
import { translator } from '../ui-language.js';

const position=node=>`left:${node.viewportWidth ? `${node.x/node.viewportWidth*100}%` : `${node.x}px`};top:${node.y}px;width:${node.viewportWidth ? `${node.width/node.viewportWidth*100}%` : `${node.width}px`}`;

/** Read-only phase labels for either timeline. */
const MINIMUM_LABEL_WIDTH=36;

export function renderPhaseControl(phase,{timeZone,escape,locale='zh-CN'}) {
  const t=translator(locale);
  const advice=!phase.fixed&&!phase.constrained
    ? usageRateAdvice(phase.baselineDailyPercent,phase.dailyPercent,locale) : '';
  const quotaLabel=phase.quotaLabel&&!phase.viewportWidth;
  // The horizontal row has one shared label/unit in its left gutter.
  const value=quotaLabel ? `${Number(phase.dailyPercent.toFixed(1))}%`
    : advice||usageRateDetail(phase.baselineDailyPercent,phase.dailyPercent,locale);
  // A phase too narrow for its figure shows none; the title keeps the detail
  // and the quota row still marks the gap.
  const tooNarrow=quotaLabel&&Number.isFinite(phase.width)&&phase.width<MINIMUM_LABEL_WIDTH;
  const label=phase.reason==='no-resource'&&!quotaLabel ? `<strong>${t('暂停')}</strong>`
    : tooNarrow ? '<strong aria-hidden="true"></strong>'
    : `<strong class="${advice ? 'phase-advice' : 'phase-budget'}">${escape(value)}</strong>`;
  const review=phase.stageReason==='if-no-extra-reset-after-48h' ? t('若两天后仍未额外 reset')
    : phase.stageReason==='if-no-extra-reset-at-review' ? t('若仍未额外 reset') : '';
  const detail=phase.reason==='no-resource' ? t('暂停') : usageRateDetail(phase.baselineDailyPercent,phase.dailyPercent,locale);
  const labelHeight=phase.labelHeight??(phase.nextResetOpportunity ? 36+resetOpportunityLayout(phase.width).height : 34);
  return `<div class="phase-controls" data-phase-start-at="${escape(phase.startAt)}" data-phase-daily="${phase.dailyPercent}" data-phase-baseline="${phase.baselineDailyPercent}" ${quotaLabel ? 'data-quota-label' : ''} title="${escape([review,detail].filter(Boolean).join(' · '))}" style="${position(phase)}${quotaLabel ? `;--phase-label-height:${labelHeight}px` : ''}">${review&&!quotaLabel ? `<small class="review-condition">${review}</small>` : ''}${label}${renderResetOpportunity(phase.nextResetOpportunity,{timeZone,escape,locale,compact:quotaLabel,width:phase.width})}</div>`;
}

export function renderStrategyNode(node,escape,locale='zh-CN') {
  const t=translator(locale);
  const interactive=node.resetIndex!==undefined || node.type==='alternative' || node.type==='selected'&&node.canChoose;
  const data=node.resetIndex!==undefined ? `data-backup-choice="${node.resetIndex}" aria-pressed="${!node.held}" title="${t(node.held ? '选择使用这个备用 reset，联动规划用量' : '改为保留这个备用 reset，重新规划')}"`
    : node.type==='selected'&&node.canChoose ? `data-inspect-level="${node.level}"`
    : node.type==='alternative' ? `data-tree-action="${escape(node.actionId)}" data-level="${node.level}"` : '';
  return `<${interactive ? 'button type="button"' : 'div'} class="graph-node graph-${node.type}${node.warning ? ' graph-warning' : ''}" data-node-id="${escape(node.id)}" ${data} ${node.type==='alternative' ? `title="${t('选择这条分支，重新规划后续')}"` : ''} style="${position(node)};min-height:${node.height}px">
      <strong>${escape(node.title)}${node.type==='selected'&&node.recommended ? `<em>${t('推荐')}</em>` : ''}</strong>
      ${node.lines.map((line,index)=>`<span${node.lineTones?.[index]==='danger' ? ' class="deadline-warning"' : ''}>${escape(line)}</span>`).join('')}
    </${interactive ? 'button' : 'div'}>`;
}
