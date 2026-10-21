const HOUR = 3_600_000;
const EPS = 1e-6;

/** Compress a solved policy into action/event milestones without changing it.
 * Forecast annotations use one origin (plan start). The stochastic solver's
 * conditional probabilities remain separate and are never replaced by a CDF. */
export function policyMilestones(result, cumulativeProbability) {
  const levels = result.decisionTree.levels;
  const selected = levels.map(level => level.actions.find(action => action.id === level.selectedActionId));
  const steps = selected.map(action => action.outcome);
  const endHours = steps.at(-1).endHours;
  const endKind = result.planningEndKind
    ?? (levels.at(-1).resetProbability >= 1 - EPS ? 'extra-reset' : 'normal-refresh');
  const at = hour => new Date(Math.round(Date.parse(result.now) + hour * HOUR)).toISOString();
  const key = hour => Number(hour.toFixed(7));
  const entries = new Map();
  const point = hour => {
    const value = key(hour);
    if (!entries.has(value)) entries.set(value, { hours: value, at: at(value), reasons: [], events: [] });
    return entries.get(value);
  };
  point(0).reasons.push('current');
  point(endHours).reasons.push(endKind);
  const usage = steps.flatMap(step => step.usageSegments).filter(segment => segment.endHours - segment.startHours > EPS);
  let previous = null;
  for (const segment of usage) {
    const daily = segment.multiplier * result.averagePercentPerDay;
    if (previous && Math.abs(previous.daily - daily) > 1e-5)
      point(segment.startHours).reasons.push('pace-change');
    if (segment.kind === 'quota' && segment.remainingBefore > EPS && segment.remainingAfter <= EPS
      &&usage.find(next=>Math.abs(next.startHours-segment.endHours)<EPS)?.kind!=='rest'
      && segment.endHours < endHours - EPS) {
      point(segment.endHours).reasons.push('depletion');
    }
    previous = { daily };
  }
  const bankEvents = steps.flatMap(step => step.events).filter(event => event.kind === 'backup');
  const supplyEvents=steps.flatMap(step=>step.events).filter(event=>
    ['backup','normal-refresh','assumed-extra-reset'].includes(event.kind));
  for (const event of supplyEvents) {
    const entry = point(event.atHours);
    entry.reasons.push(event.kind);
    entry.events.push(event);
  }
  for (const step of steps) for (const index of step.resetIndicesExpired) {
    const reset = result.resets[index];
    const entry = point(reset.expiresInHours);
    entry.reasons.push('expiry');
    entry.events.push({ kind: 'expiry', resetIndex: index, atHours: reset.expiresInHours,
      at: reset.expiresAt, expiresOn: reset.expiresOn });
  }
  if (result.credits.bridge) {
    const bridge = result.credits.bridge;
    point(bridge.atHours).events.push({ ...bridge, kind: 'credits-advisory' });
  }
  const stateAt = (hour, beforeEvents) => {
    let quota;
    const supply = supplyEvents.find(event => Math.abs(event.atHours - hour) < EPS);
    const active = usage.find(segment => segment.startHours <= hour + EPS && segment.endHours > hour + EPS);
    if (hour < EPS && beforeEvents) quota = result.remainingPercent;
    else if (supply) quota = beforeEvents ? supply.overwrittenPercent : 100;
    else if (active?.kind === 'quota') quota = Math.max(0, active.remainingBefore
      - (hour - active.startHours) * active.multiplier * result.averagePercentPerDay / 24);
    else quota = active ? active.remainingBefore : steps.at(-1).remainingAfter;
    if (!beforeEvents && Math.abs(hour - endHours) < EPS && endKind !== 'planning-horizon') quota = 100;
    const used = new Set(bankEvents.filter(event => beforeEvents ? event.atHours < hour - EPS
      : event.atHours <= hour + EPS).map(event => event.resetIndex));
    const resets = result.resets.filter((reset, index) => !used.has(index)
      && (beforeEvents ? reset.expiresInHours >= hour - EPS : reset.expiresInHours > hour + EPS)).length;
    return { quota: Number(quota.toFixed(7)), resets, credits: result.credits.balance };
  };
  const points = [...entries.values()].filter(entry => entry.hours <= endHours + EPS)
    .sort((a, b) => a.hours - b.hours).map(entry => ({ ...entry,
      reasons: [...new Set(entry.reasons)], stateBefore: stateAt(entry.hours, true),
      stateAfter: stateAt(entry.hours, false),
      cumulativeResetProbability: result.predictionEnabled ? cumulativeProbability(entry.hours) : null }));
  const segments = points.slice(0, -1).map((start, index) => {
    const end = points[index + 1];
    const active = usage.find(segment => segment.startHours <= start.hours + EPS && segment.endHours > start.hours + EPS);
    const source = levels.findIndex((level, rawIndex) => steps[rawIndex].startHours <= start.hours + EPS
      && steps[rawIndex].endHours > start.hours + EPS);
    const multiplier = active?.multiplier ?? 0;
    const usedPercent = usage.filter(segment => segment.kind === 'quota').reduce((sum, segment) => sum
      + Math.max(0, Math.min(end.hours, segment.endHours) - Math.max(start.hours, segment.startHours))
        * segment.multiplier * result.averagePercentPerDay / 24, 0);
    const before = start.cumulativeResetProbability ?? 0;
    const after = end.cumulativeResetProbability ?? 0;
    return { index, sourceLevelIndex: source,
      canChoose: source >= 0 && Math.abs(steps[source].startHours - start.hours) < EPS,
      startHours: start.hours, endHours: end.hours, startAt: start.at, endAt: end.at,
      multiplier, dailyPercent: multiplier * result.averagePercentPerDay, usedPercent,
      state: start.stateBefore, endState: end.stateBefore,
      startReasons: start.reasons, endReasons: end.reasons, events: start.events,
      cumulativeResetProbability: end.cumulativeResetProbability,
      conditionalResetProbability: Math.max(0, Math.min(1, (after - before) / Math.max(EPS, 1 - before))) };
  });
  return { segments, points, endKind, probabilityBasis: 'cumulative-from-plan-start',
    rawDecisionPeriods: levels.length };
}
