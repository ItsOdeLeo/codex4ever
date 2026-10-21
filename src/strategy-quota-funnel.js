const coordinate = value => Number(value.toFixed(6));

/** Draw simulated quota. Only explicit selected scenario events can represent
 * hypothetical refills; a probability annotation alone never widens quota.
 * The horizontal page opts into shape:'area' so vertices, labels and refill
 * strokes share a fixed bottom edge. CSS cannot change those coordinates.
 * Other callers keep symmetric geometry; quota and time data are untouched. */
export function quotaFunnelGeometry(milestones, { startX, stageWidth, centerY,
  maxThickness = 48, terminalWidth = 204, xAtHours = null,restPeriods=[],shape='symmetric' } = {}) {
  const half = quota => maxThickness * quota / 200;
  const top=height=>centerY-(shape==='area' ? height*2 : height);
  const bottom=height=>shape==='area' ? centerY : centerY+height;
  const xAt = (hours, index) => xAtHours ? xAtHours(hours) : startX + index * stageWidth;
  const bands = milestones.segments.map((segment, index) => {
    const startQuota = milestones.points[index].stateAfter.quota;
    const endQuota = milestones.points[index + 1].stateBefore.quota;
    const x1 = xAt(segment.startHours, index);
    const x2 = xAt(segment.endHours, index + 1);
    const rest=restPeriods.some(phase=>phase.startHours<=segment.startHours+1e-6&&phase.endHours>=segment.endHours-1e-6);
    return { kind: rest ? 'rest' : segment.multiplier ? 'usage' : 'pause', index, x1, x2, centerY,
      startQuota, endQuota, startAt: segment.startAt, endAt: segment.endAt,
      startHalf: half(startQuota), endHalf: half(endQuota) };
  });
  const refills = milestones.points.filter(point => point.events.some(event =>
    ['backup','normal-refresh','assumed-extra-reset'].includes(event.kind)))
    .map(point => ({ kind: point.events.some(event=>event.kind==='assumed-extra-reset') ? 'assumed-extra'
      : point.events.some(event=>event.kind==='normal-refresh') ? 'normal' : 'backup',
      sequence:point.events.find(event=>event.kind==='assumed-extra-reset')?.sequence??null,
      x: xAt(point.hours, milestones.points.indexOf(point)),
      centerY, before: point.stateBefore.quota, after: point.stateAfter.quota, at: point.at }));
  if (['normal-refresh','assumed-extra-reset'].includes(milestones.endKind)) {
    const point = milestones.points.at(-1);
    const x = xAt(point.hours, milestones.segments.length);
    if(!refills.some(refill=>refill.at===point.at))refills.push({ kind: 'normal', x, centerY, before: point.stateBefore.quota,
      after: point.stateAfter.quota, at: point.at });
    bands.push({ kind: milestones.endKind==='assumed-extra-reset' ? 'assumed-refresh' : 'refresh', x1: x, x2: x + terminalWidth, centerY,
      startQuota: point.stateAfter.quota, endQuota: point.stateAfter.quota,
      startHalf: half(point.stateAfter.quota), endHalf: half(point.stateAfter.quota) });
  }
  for (const band of bands) {
    const { x1, x2, startHalf, endHalf } = band;
    band.path = `M ${x1} ${coordinate(top(startHalf))} L ${x2} ${coordinate(top(endHalf))} L ${x2} ${coordinate(bottom(endHalf))} L ${x1} ${coordinate(bottom(startHalf))} Z`;
    band.baseline = `M ${x1} ${centerY} H ${x2}`;
    band.labels = band.kind==='rest' ? [] : [
      { x: x1 + 8, y: coordinate(bottom(startHalf) + 16), quota: band.startQuota, anchor: 'start' },
      ...(['refresh','assumed-refresh'].includes(band.kind) ? []
        : [{ x: x2 - 8, y: coordinate(bottom(endHalf) + 16), quota: band.endQuota, anchor: 'end' }])
    ];
  }
  for (const refill of refills) {
    refill.path = `M ${refill.x} ${coordinate(top(half(refill.after)))} V ${coordinate(bottom(half(refill.after)))}`;
  }
  return { bands, refills, maxThickness,shape };
}
