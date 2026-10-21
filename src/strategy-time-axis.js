const HOUR = 3_600_000;

/** Equal-width local calendar days; timestamps keep their position within a day. */
export function strategyTimeAxis({ now, timeZone, endHours, dayWidth = 180, padding = 40, leftPadding = padding }) {
  const start = Date.parse(now);
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    second: '2-digit', hourCycle: 'h23' });
  const date = Object.fromEntries(formatter.formatToParts(start).map(part => [part.type, part.value]));
  const midnight = offset => {
    const target = Date.UTC(+date.year, +date.month - 1, +date.day + offset);
    let instant = target;
    for (let attempt = 0; attempt < 4; attempt++) {
      const p = Object.fromEntries(formatter.formatToParts(instant).map(part => [part.type, part.value]));
      const local = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
      const corrected = target - (local - instant);
      if (corrected === instant) return instant;
      instant = corrected;
    }
    return instant;
  };
  const label = new Intl.DateTimeFormat('zh-CN', { timeZone, month: 'numeric', day: 'numeric' });
  const days = [];
  for (let offset = 0; ; offset++) {
    const from = midnight(offset), to = midnight(offset + 1);
    days.push({ x: leftPadding + offset * dayWidth, width: dayWidth,
      startAt: new Date(from).toISOString(), endAt: new Date(to).toISOString(),
      startHours: (from - start) / HOUR, endHours: (to - start) / HOUR,
      label: label.format(from + HOUR) });
    if (to >= start + endHours * HOUR) break;
  }
  const xAtHours = hours => {
    const day = days.find(day => hours >= day.startHours && hours < day.endHours) ?? days.at(-1);
    return day.x + (hours - day.startHours) / (day.endHours - day.startHours) * dayWidth;
  };
  return { days, dayWidth, padding,leftPadding, nowX: xAtHours(0), xAtHours,
    width: leftPadding + padding + days.length * dayWidth };
}
