import { getWeekZoomMetrics, keepPinchByOrigin } from '../constants/weekZoom';
import { WEEK_TIME_COL_WIDTH } from '../constants/weekLayout';

export type PinchFocus = { x: number; y: number };
export type PinchOrigin = { col: number; row: number };

export type WeekPinchLive = {
  apply: (level: number, focus: PinchFocus | null) => void;
  reset: () => void;
};

export function emptyWeekPinchLive(): WeekPinchLive {
  return { apply() {}, reset() {} };
}

export function applyLiveWeekPinch(args: {
  root: HTMLElement;
  grid: HTMLElement;
  time?: HTMLElement | null;
  daysTrack: HTMLElement | null;
  gridInner: HTMLElement | null;
  viewportWidth: number;
  dayCount: number;
  hourCount: number;
  level: number;
  focus: PinchFocus | null;
  origin: PinchOrigin | null;
}): PinchOrigin | null {
  const { colWidth, rowHeight } = getWeekZoomMetrics(args.level, args.viewportWidth);
  const gridWidth = colWidth * args.dayCount;
  const innerWidth = WEEK_TIME_COL_WIDTH + gridWidth;
  args.root.style.setProperty('--week-col-width', `${colWidth}px`);
  args.root.style.setProperty('--week-row-height', `${rowHeight}px`);
  if (args.gridInner) args.gridInner.style.width = `${innerWidth}px`;
  if (args.daysTrack) args.daysTrack.style.width = `${gridWidth}px`;

  const focus = args.focus;
  if (!focus || colWidth <= 0 || rowHeight <= 0) return args.origin;

  const rect = args.grid.getBoundingClientRect();
  const viewX = focus.x - rect.left;
  const viewY = focus.y - rect.top;
  const dayViewX = Math.max(0, viewX - WEEK_TIME_COL_WIDTH);
  const origin = args.origin ?? {
    col: (args.grid.scrollLeft + dayViewX) / colWidth,
    row: (args.grid.scrollTop + viewY) / rowHeight,
  };
  const maxLeft = Math.max(0, innerWidth - args.grid.clientWidth);
  const maxTop = Math.max(0, rowHeight * args.hourCount - args.grid.clientHeight);
  args.grid.scrollLeft = keepPinchByOrigin(origin.col, colWidth, dayViewX, maxLeft);
  args.grid.scrollTop = keepPinchByOrigin(origin.row, rowHeight, viewY, maxTop);
  if (args.daysTrack) {
    args.daysTrack.style.transform = `translate3d(${-args.grid.scrollLeft}px,0,0)`;
  }
  return origin;
}
