// Presentation data comes from simulated actions and their optimized fallback.
// No balances, probabilities or strategy choices are invented by the renderer.
export function strategyTreeView(result) {
  const round = value => Number(value.toFixed(1));
  const date = value => new Intl.DateTimeFormat('zh-CN', { timeZone: result.timeZone,
    month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value));
  const pace = action => {
    if (!action.multiplier) return '这一步先不用';
    const relative = action.multiplier / result.startingPoint.multiplier;
    if (Math.abs(relative - 1) < 1e-6) return '按你的起点用';
    if (action.id.startsWith('use-before-')) return `提前用完当前额度 · 起点的 ${round(relative)} 倍`;
    return relative < 1 ? `降到起点的 ${round(relative * 100)}%`
      : `提高到起点的 ${round(relative * 100)}%`;
  };
  return result.decisionTree.levels.map(level => {
    const actions = level.actions.map(item => {
      const step = item.outcome;
      const bank = step.events.find(event => event.kind === 'backup');
      const supply = !item.action.multiplier ? '保留现有资源'
        : bank ? `${bank.atHours <= step.startHours + 1e-7 ? '现在' : date(bank.at)}用备用 reset`
          : level.state.resets ? '这一步不用备用 reset' : '使用现有额度';
      const effects = [`额度 ${round(level.state.quota)}% → ${round(step.remainingAfter)}%`];
      if (step.resetIndicesUsed.length) effects.push(`用 ${step.resetIndicesUsed.length} 个备用`);
      if (step.resetIndicesExpired.length) effects.push(`${step.resetIndicesExpired.length} 个备用将过期`);
      if (step.pauseHours > 1e-7) effects.push(`停用 ${round(step.pauseHours)} 小时`);
      const fallback = [];
      fallback.push(item.fallback.firstPauseAt ? `${date(item.fallback.firstPauseAt)}须暂停`
        : '可接正常刷新');
      if (item.fallback.expiredResets) fallback.push(`${item.fallback.expiredResets} 个备用会过期`);
      const events = step.events.filter(event => event.kind === 'backup').map(event =>
        `${date(event.at)}用 ${event.expiresOn} 到期的备用；覆盖 ${round(event.overwrittenPercent)}% 当前额度`);
      return { ...item, title: pace(item.action), supply, effects: effects.join(' · '),
        fallbackText: fallback.join(' · '), events,
        dailyPercent: round(result.averagePercentPerDay * item.action.multiplier),
        // Each action category remains reachable even when several have the
        // same intensity: immediate redemption, waiting, bridging and rest.
        category: item.action.multiplier === 0 ? 'pause'
          : item.action.id.startsWith('use-before-') ? 'deadline'
            : bank ? item.action.bankMode === 'now' ? 'bank-now' : 'bank-later' : 'hold' };
    });
    const preview = new Set([actions[0].id]);
    for (const category of ['deadline', 'hold', 'bank-now', 'bank-later', 'credits', 'pause']) {
      const item = actions.find(action => action.category === category);
      if (item) preview.add(item.id);
    }
    for (const id of ['steady', 'more', 'flexible']) {
      const item = actions.find(action => action.action.id === id);
      if (item) preview.add(item.id);
    }
    preview.add(level.selectedActionId);
    const selected = actions.find(action => action.id === level.selectedActionId);
    const following = result.decisionTree.levels[level.index + 1];
    const bankNext = following?.actions.find(action => action.id === following.selectedActionId)
      ?.outcome.resetIndicesUsed.length;
    return { ...level, date: date(level.startAt), until: date(level.endAt), actions, selected,
      previewActionIds: [...preview],
      headline: selected.action.multiplier === 0 ? '这一步先暂停'
        : selected.action.id === 'use-before-deadline' && (selected.outcome.resetIndicesUsed.length || bankNext)
          ? '先消耗当前额度，再在到期前用备用 reset'
            : selected.action.bankMode === 'now' ? '现在用备用 reset，再继续使用'
              : `${selected.title}${selected.outcome.resetIndicesUsed.length ? '，到时用备用 reset' : ''}` };
  });
}

/** Event-scale presentation of the same solved policy. Hidden daily decisions
 * remain in decisionTree for optimization; they do not become fake events. */
export function strategyMilestoneView(result) {
  const raw = strategyTreeView(result);
  const time = value => new Intl.DateTimeFormat('zh-CN', { timeZone: result.timeZone,
    month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value));
  const day = value => new Intl.DateTimeFormat('zh-CN', { timeZone: result.timeZone,
    month: 'long', day: 'numeric' }).format(new Date(value));
  return result.milestones.segments.map(segment => {
    const source = raw[segment.sourceLevelIndex];
    const events = segment.events.filter(event => ['backup', 'expiry'].includes(event.kind));
    const preciseStart = segment.startReasons.some(reason => ['depletion', 'backup', 'expiry'].includes(reason));
    const preciseEnd = segment.endReasons.some(reason => ['depletion', 'backup', 'expiry', 'normal-refresh'].includes(reason));
    const outcome = { ...source.selected.outcome,
      startHours: segment.startHours, endHours: segment.endHours,
      startAt: segment.startAt, endAt: segment.endAt,
      multiplier: segment.multiplier, remainingBefore: segment.state.quota,
      remainingAfter: segment.endState.quota, resetsRemaining: segment.endState.resets,
      creditsRemaining: segment.endState.credits, events,
      usedDays: segment.usedPercent / result.averagePercentPerDay,
      pauseHours: segment.multiplier ? 0 : segment.endHours - segment.startHours };
    const selected = { ...source.selected,
      dailyPercent: Number(segment.dailyPercent.toFixed(1)), outcome,
      action: { ...source.selected.action, multiplier: segment.multiplier,
        id: segment.multiplier ? source.selected.action.id : 'pause' } };
    const expiry = events.find(event => event.kind === 'expiry');
    const date = segment.startReasons.includes('current') ? '现在'
      : expiry ? `${expiry.expiresOn.slice(5).replace('-', '/')}结束 · 备用到期`
        : preciseStart ? `预计 ${time(segment.startAt)}` : `${day(segment.startAt)} · 调整用量`;
    const until = preciseEnd ? time(segment.endAt) : `约 ${day(segment.endAt)}`;
    const endDescription = segment.endReasons.includes('normal-refresh') ? `${until}正常刷新`
      : segment.endReasons.includes('depletion') ? `预计 ${until}耗尽`
        : segment.endReasons.includes('pace-change') ? `${until}调整用量` : until;
    return { ...source, index: segment.index, sourceLevelIndex: segment.sourceLevelIndex,
      canChoose: segment.canChoose, startAt: segment.startAt, endAt: segment.endAt,
      state: segment.state, selected, date, until, endDescription,
      actions: segment.canChoose ? source.actions : [],
      resetProbability: segment.conditionalResetProbability,
      cumulativeResetProbability: segment.cumulativeResetProbability,
      creditsBridge: segment.events.find(event => event.kind === 'credits-advisory'),
      startReasons: segment.startReasons };
  });
}
