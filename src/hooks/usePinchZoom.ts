import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import type { ZoomLevel } from '../types';
import { WEEK_ZOOM_MAX, WEEK_ZOOM_MIN, weekZoomHint } from '../constants/weekZoom';

const ZOOM_ORDER: ZoomLevel[] = ['year', 'month', 'week', 'day'];

function isAppleMobile() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function usePinchZoom() {
  const { zoom, weekZoom, setWeekZoom, setZoom } = useApp();
  const ref = useRef<HTMLDivElement>(null);
  const [liveScale, setLiveScale] = useState(1);
  const [pinching, setPinching] = useState(false);

  const zoomRef = useRef(zoom);
  const weekRef = useRef(weekZoom);
  const setWeekRef = useRef(setWeekZoom);
  const setZoomRef = useRef(setZoom);
  zoomRef.current = zoom;
  weekRef.current = weekZoom;
  setWeekRef.current = setWeekZoom;
  setZoomRef.current = setZoom;

  const startWeek = useRef(0);
  const startLevel = useRef<ZoomLevel>('week');
  const startDist = useRef(0);
  const lastScale = useRef(1);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const frame = useRef<number | null>(null);
  const pendingWeek = useRef(weekZoom);
  const pendingLive = useRef(1);
  const consumed = useRef(false);
  const lockUntil = useRef(0);

  const flush = useCallback(() => {
    frame.current = null;
    setWeekRef.current(pendingWeek.current);
    setLiveScale(pendingLive.current);
  }, []);

  const schedule = useCallback(() => {
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(flush);
  }, [flush]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const stepFromStart = (dir: 1 | -1) => {
      const i = ZOOM_ORDER.indexOf(startLevel.current);
      const next = ZOOM_ORDER[i + dir];
      if (next) setZoomRef.current(next);
    };

    const applyScale = (scale: number) => {
      lastScale.current = scale;
      const z = zoomRef.current;
      if (z === 'week') {
        const raw = startWeek.current + (scale - 1) * 0.95;
        if (raw < WEEK_ZOOM_MIN) {
          pendingWeek.current = WEEK_ZOOM_MIN;
          const extra = 1 - scale;
          pendingLive.current = Math.max(0.78, 1 - extra * 0.28);
        } else if (raw > WEEK_ZOOM_MAX) {
          pendingWeek.current = WEEK_ZOOM_MAX;
          pendingLive.current = 1;
        } else {
          pendingWeek.current = raw;
          pendingLive.current = 1;
        }
      } else if (z === 'day') {
        pendingLive.current = 1;
      } else {
        const t = scale - 1;
        const rubber = Math.sign(t) * Math.min(0.2, Math.abs(t) * 0.32);
        pendingLive.current = 1 + rubber;
      }
      schedule();
    };

    const begin = () => {
      if (Date.now() < lockUntil.current) return;
      startLevel.current = zoomRef.current;
      startWeek.current = weekRef.current;
      lastScale.current = 1;
      pendingLive.current = 1;
      pendingWeek.current = weekRef.current;
      consumed.current = false;
      setPinching(true);
    };

    const finish = () => {
      if (consumed.current) {
        setPinching(false);
        pendingLive.current = 1;
        schedule();
        return;
      }
      consumed.current = true;
      const scale = lastScale.current;
      const z = startLevel.current;
      setPinching(false);
      pendingLive.current = 1;
      schedule();

      let changed = false;
      if (z === 'week') {
        if (pendingWeek.current <= 0.03 && scale < 0.8) {
          stepFromStart(-1);
          changed = true;
        }
      } else if (z === 'day') {
        if (scale < 0.84) {
          stepFromStart(-1);
          changed = true;
        }
      } else if (scale > 1.16) {
        stepFromStart(1);
        changed = true;
      } else if (scale < 0.84) {
        stepFromStart(-1);
        changed = true;
      }
      if (changed) lockUntil.current = Date.now() + 720;
    };

    if (isAppleMobile()) {
      const onStart = (event: Event) => { event.preventDefault(); begin(); };
      const onChange = (event: Event) => {
        event.preventDefault();
        const scale = (event as Event & { scale?: number }).scale;
        if (typeof scale === 'number') applyScale(scale);
      };
      const onEnd = (event: Event) => {
        event.preventDefault();
        const scale = (event as Event & { scale?: number }).scale;
        if (typeof scale === 'number') lastScale.current = scale;
        finish();
      };
      el.addEventListener('gesturestart', onStart, { passive: false });
      el.addEventListener('gesturechange', onChange, { passive: false });
      el.addEventListener('gestureend', onEnd, { passive: false });
      return () => {
        el.removeEventListener('gesturestart', onStart);
        el.removeEventListener('gesturechange', onChange);
        el.removeEventListener('gestureend', onEnd);
      };
    }

    const onPointerDown = (event: PointerEvent) => {
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.current.size === 2) {
        const [a, b] = [...pointers.current.values()];
        startDist.current = dist(a, b);
        begin();
      }
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!pointers.current.has(event.pointerId)) return;
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.current.size === 2 && startDist.current > 0) {
        event.preventDefault();
        const [a, b] = [...pointers.current.values()];
        applyScale(dist(a, b) / startDist.current);
      }
    };
    const onPointerUp = (event: PointerEvent) => {
      const hadTwo = pointers.current.size >= 2;
      pointers.current.delete(event.pointerId);
      if (hadTwo && pointers.current.size < 2) finish();
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
    };
  }, [schedule]);

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
  }, []);

  return { ref, liveScale, pinching };
}

export function zoomHint(level: ZoomLevel, weekZoomLevel = 0, viewportWidth = 390) {
  if (level === 'week') return weekZoomHint(weekZoomLevel, viewportWidth);
  const hints: Record<Exclude<ZoomLevel, 'week'>, string> = {
    year: 'Разведи пальцы → месяц',
    month: 'Разведи пальцы → неделя · сведи → год',
    day: 'Сведи пальцы → неделя',
  };
  return hints[level];
}
