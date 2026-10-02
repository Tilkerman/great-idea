import { formatTime } from './date';

/** Конец последнего слота: час 21 в сетке 7–21 — это 21:00–22:00. */
export function gridEndExclusiveHour(dayEndHour: number) {
  return dayEndHour + 1;
}

export function nowInHourGrid(now: Date, dayStartHour: number, dayEndHour: number) {
  const startMin = dayStartHour * 60;
  const endMin = gridEndExclusiveHour(dayEndHour) * 60;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const total = endMin - startMin;
  if (total <= 0) return null;
  // До первого часа и после последнего черта остаётся на краю сетки, а не пропадает.
  const clampedMin = Math.min(Math.max(nowMin, startMin), endMin);
  return {
    nowMin,
    startMin,
    endMin,
    total,
    ratio: (clampedMin - startMin) / total,
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
