export const WEEK_ZOOM_MIN = 0;
export const WEEK_ZOOM_MAX = 1;
/** С этого масштаба на карточках появляется крестик удаления */
export const WEEK_ZOOM_DELETE_MIN = 0.6;
/** С этого масштаба на карточках появляется номер дела */
export const WEEK_ZOOM_BADGE_MIN = 0.2;
/** С этого масштаба на карточках появляется название */
export const WEEK_ZOOM_TITLE_MIN = 0.1;
/** До этого (включительно 15%) только мелкие названия, без описания */
export const WEEK_ZOOM_TITLE_ONLY_MAX = 0.15;
/** С этого масштаба на карточках появляется описание */
export const WEEK_ZOOM_DESC_MIN = 0.25;
/** С этого масштаба в неполном часе видна полоска «добавить» */
export const WEEK_ZOOM_ADD_MIN = 0.2;
/** С этого масштаба цифры часов начинают расти в высоту */
export const WEEK_ZOOM_TIME_GROW_MIN = 0.5;
/** Дальше этого цифры часов не увеличиваются */
export const WEEK_ZOOM_TIME_GROW_MAX = 0.75;
/** С этого масштаба в шапке недели полное имя дня */
export const WEEK_ZOOM_WEEKDAY_FULL_MIN = 0.65;
export const TIME_COL_WIDTH = 50;

/** Тот же процент, что в подписи − / 10% / + */
export function weekZoomPercent(level: number) {
  const t = Math.min(WEEK_ZOOM_MAX, Math.max(WEEK_ZOOM_MIN, level));
  return Math.round(t * 100);
}

export function weekZoomAtLeast(level: number, min: number) {
  return weekZoomPercent(level) >= Math.round(min * 100);
}

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
