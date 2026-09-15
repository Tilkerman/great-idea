import { formatTime } from './date';

/** Конец последнего слота: час 21 в сетке 7–21 — это 21:00–22:00. */
export function gridEndExclusiveHour(dayEndHour: number) {
  return dayEndHour + 1;
}

export function nowInHourGrid(now: Date, dayStartHour: number, dayEndHour: number) {
  const startMin = dayStartHour * 60;
  const endMin = gridEndExclusiveHour(dayEndHour) * 60;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  if (nowMin < startMin || nowMin >= endMin) return null;
  const total = endMin - startMin;
  return {
    nowMin,
    startMin,
    endMin,
    total,
    ratio: (nowMin - startMin) / total,
    label: formatTime(now),
  };
}

export function nowLineTopPx(
  now: Date,
  dayStartHour: number,
  dayEndHour: number,
  gridHeightPx: number,
) {
  if (gridHeightPx <= 0) return null;
  const pos = nowInHourGrid(now, dayStartHour, dayEndHour);
  if (!pos) return null;
  return { topPx: pos.ratio * gridHeightPx, label: pos.label };
}
