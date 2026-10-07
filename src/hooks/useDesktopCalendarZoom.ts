import { useEffect, type RefObject } from 'react';
import { useApp } from '../context/AppContext';
import { WEEK_ZOOM_MAX, WEEK_ZOOM_MIN } from '../constants/weekZoom';
import type { ZoomLevel } from '../types';

const ZOOM_ORDER: ZoomLevel[] = ['year', 'month', 'week', 'day'];
const LEVEL_LOCK_MS = 720;

export function useDesktopCalendarZoom(
  containerRef: RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  const { zoom, setZoom, weekZoom, setWeekZoom } = useApp();

  useEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;

    let levelLockUntil = 0;

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();

      const z = zoom;
      if (z === 'week' || z === 'day') {
        const step = -event.deltaY * 0.0025;
        const next = Math.min(WEEK_ZOOM_MAX, Math.max(WEEK_ZOOM_MIN, weekZoom + step));
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
