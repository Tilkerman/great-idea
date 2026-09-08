export const WEEK_ZOOM_MIN = 0;
export const WEEK_ZOOM_MAX = 1;
/** С этого масштаба на карточках появляется крестик удаления */
export const WEEK_ZOOM_DELETE_MIN = 0.6;
/** С этого масштаба на карточках появляется номер дела */
export const WEEK_ZOOM_BADGE_MIN = 0.2;
/** С этого масштаба на карточках появляется название */
export const WEEK_ZOOM_TITLE_MIN = 0.01;
/** С этого масштаба в неполном часе видна полоска «добавить» */
export const WEEK_ZOOM_ADD_MIN = 0.2;
export const TIME_COL_WIDTH = 44;

/** t=0: вся неделя на экране. t=1: почти один день. */
export function getWeekZoomMetrics(level: number, viewportWidth: number) {
  const t = Math.min(WEEK_ZOOM_MAX, Math.max(WEEK_ZOOM_MIN, level));
  const avail = Math.max(240, viewportWidth - TIME_COL_WIDTH);
  const minCol = avail / 7;
  const maxCol = avail * 0.94;
  const colWidth = minCol + (maxCol - minCol) * t;
  const rowHeight = 72 + t * 88;
  return { level: t, colWidth, rowHeight, daysVisible: avail / colWidth };
}

export function weekZoomHint(level: number, viewportWidth = 390) {
  const { daysVisible } = getWeekZoomMetrics(level, viewportWidth);
  const days = daysVisible.toFixed(1);
  if (level >= WEEK_ZOOM_MAX - 0.02) {
    return `Один день · листай в стороны · сведи пальцы — вся неделя`;
  }
  if (level <= WEEK_ZOOM_MIN + 0.02) {
    return `Вся неделя на экране · сведи сильнее → месяц`;
  }
  return `${days} дня на экране · разведи/сведи плавно`;
}
