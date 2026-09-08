export const WEEK_ZOOM_MIN = 1;
export const WEEK_ZOOM_MAX = 3;

/** Ширина колонки дня и высота строки часа для каждого уровня масштаба недели */
export function getWeekZoomMetrics(level: number) {
  const lv = Math.min(WEEK_ZOOM_MAX, Math.max(WEEK_ZOOM_MIN, Math.round(level)));
  const colWidth = 72 + (lv - 1) * 48; // 72 → 120 → 168 px (~2.5 дня на экране)
  const rowHeight = 96 + (lv - 1) * 28; // 96 → 124 → 152 px
  return { level: lv, colWidth, rowHeight };
}

export function weekZoomHint(level: number) {
  const { colWidth } = getWeekZoomMetrics(level);
  const daysVisible = (420 / colWidth).toFixed(1);
  if (level >= WEEK_ZOOM_MAX) {
    return `Макс. масштаб (~${daysVisible} дня) · щипок внутрь → день`;
  }
  if (level <= WEEK_ZOOM_MIN) {
    return `Масштаб ${level}/${WEEK_ZOOM_MAX} · щипок внутрь — увеличить · наружу → месяц`;
  }
  return `Масштаб ${level}/${WEEK_ZOOM_MAX} (~${daysVisible} дня) · щипок — изменить масштаб`;
}
