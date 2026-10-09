import { useEffect, useRef, type RefObject } from 'react';
import { useApp } from '../context/AppContext';
import {
  getWeekZoomMetrics,
  WEEK_ZOOM_MAX,
  WEEK_ZOOM_MIN,
} from '../constants/weekZoom';
import { WEEK_TIME_COL_WIDTH } from '../constants/weekLayout';
import type { ZoomLevel } from '../types';

const ZOOM_ORDER: ZoomLevel[] = ['year', 'month', 'week', 'day'];
const LEVEL_LOCK_MS = 720;

type WeekZoomAnchor = {
  grid: HTMLDivElement;
  pointerX: number;
  pointerY: number;
  contentX: number;
  contentY: number;
  beforeColWidth: number;
  beforeRowHeight: number;
  afterColWidth: number;
  afterRowHeight: number;
};

export function useDesktopCalendarZoom(
  containerRef: RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  const { zoom, setZoom, weekZoom, setWeekZoom } = useApp();
  const pendingAnchorRef = useRef<WeekZoomAnchor | null>(null);
  const anchorFrameRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (anchorFrameRef.current !== null) {
      cancelAnimationFrame(anchorFrameRef.current);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;

    let levelLockUntil = 0;

    const keepWeekPointUnderCursor = (
      event: WheelEvent,
      beforeLevel: number,
      afterLevel: number,
    ) => {
      const grid = el.querySelector<HTMLDivElement>('.week-view__grid-scroll');
      if (!grid) return;

      const rect = grid.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      if (
        pointerX < 0
        || pointerY < 0
        || pointerX > rect.width
        || pointerY > rect.height
      ) return;

      const before = getWeekZoomMetrics(beforeLevel, el.clientWidth);
      const after = getWeekZoomMetrics(afterLevel, el.clientWidth);
      pendingAnchorRef.current = {
        grid,
        pointerX,
        pointerY,
        contentX: grid.scrollLeft + pointerX,
        contentY: grid.scrollTop + pointerY,
        beforeColWidth: before.colWidth,
        beforeRowHeight: before.rowHeight,
        afterColWidth: after.colWidth,
        afterRowHeight: after.rowHeight,
      };

      if (anchorFrameRef.current !== null) return;
      // React applies the new column sizes after this native wheel callback.
      // A second frame makes the correction land after layout, not before it.
      anchorFrameRef.current = requestAnimationFrame(() => {
        anchorFrameRef.current = requestAnimationFrame(() => {
          anchorFrameRef.current = null;
          const anchor = pendingAnchorRef.current;
          pendingAnchorRef.current = null;
          if (!anchor?.grid.isConnected) return;

          const scaledX = WEEK_TIME_COL_WIDTH
            + Math.max(0, anchor.contentX - WEEK_TIME_COL_WIDTH)
              * (anchor.afterColWidth / anchor.beforeColWidth);
          const scaledY = anchor.contentY
            * (anchor.afterRowHeight / anchor.beforeRowHeight);
          anchor.grid.scrollLeft = Math.max(0, scaledX - anchor.pointerX);
          anchor.grid.scrollTop = Math.max(0, scaledY - anchor.pointerY);
        });
      });
    };

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();

      const z = zoom;
      if (z === 'week' || z === 'day') {
        // Same direction as pinch: scroll up / pinch-in grows columns, scroll down / pinch-out shrinks them.
        const step = -event.deltaY * 0.0025;
        if (z === 'day' && step < 0) {
          setZoom('week');
          setWeekZoom(Math.max(WEEK_ZOOM_MIN, Math.min(WEEK_ZOOM_MAX, WEEK_ZOOM_MAX + step)));
          return;
        }
        const base = z === 'day' ? WEEK_ZOOM_MAX : weekZoom;
        const next = Math.min(WEEK_ZOOM_MAX, Math.max(WEEK_ZOOM_MIN, base + step));
        if (z === 'week' && next !== base) {
          keepWeekPointUnderCursor(event, base, next);
        }
        setWeekZoom(next);
        return;
      }

      if (Date.now() < levelLockUntil) return;
      const dir = event.deltaY < 0 ? 1 : -1;
      const i = ZOOM_ORDER.indexOf(z);
      const next = ZOOM_ORDER[i + dir];
      if (next) {
        setZoom(next);
        levelLockUntil = Date.now() + LEVEL_LOCK_MS;
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [containerRef, enabled, setWeekZoom, setZoom, weekZoom, zoom]);
}
