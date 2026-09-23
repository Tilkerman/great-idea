import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { tLocale } from '../i18n/catalog';
import type { Locale, ZoomLevel } from '../types';
import { WEEK_TO_MONTH_OVERSHOOT, WEEK_ZOOM_MAX, WEEK_ZOOM_MIN, weekZoomHint } from '../constants/weekZoom';

const ZOOM_ORDER: ZoomLevel[] = ['year', 'month', 'week', 'day'];

type PinchSource = 'gesture' | 'touch' | 'pointer';

export type PinchFocus = { x: number; y: number };

function midpoint(a: { x: number; y: number }, b: { x: number; y: number }): PinchFocus {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function isAppleMobile() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

function isTouchMobile() {
  return !isAppleMobile() && (navigator.maxTouchPoints > 1 || 'ontouchstart' in window);
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function usePinchZoom() {
  const { zoom, weekZoom, setWeekZoom, setZoom } = useApp();
  const ref = useRef<HTMLDivElement>(null);
  const [liveScale, setLiveScale] = useState(1);
  const [pinching, setPinching] = useState(false);
  const pinchFocusRef = useRef<PinchFocus | null>(null);

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
  const frame = useRef<number | null>(null);
  const pendingWeek = useRef(weekZoom);
  const pendingLive = useRef(1);
  const consumed = useRef(false);
  const lockUntil = useRef(0);
  const pinchSource = useRef<PinchSource | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const touches = useRef(new Map<number, { x: number; y: number }>());

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
      setPinching(true);
      const z = zoomRef.current;
      if (z === 'week' || z === 'day') {
        const raw = startWeek.current + (scale - 1) * 0.95;
        if (raw < WEEK_ZOOM_MIN) {
          pendingWeek.current = WEEK_ZOOM_MIN;
          const overshoot = WEEK_ZOOM_MIN - raw;
          pendingLive.current = Math.max(0.72, 1 - overshoot * 0.38);
        } else if (raw > WEEK_ZOOM_MAX) {
          pendingWeek.current = WEEK_ZOOM_MAX;
          pendingLive.current = 1;
        } else {
          pendingWeek.current = raw;
          pendingLive.current = 1;
        }
        if (z === 'day' && raw < WEEK_ZOOM_MAX - 0.02) {
          setZoomRef.current('week');
        }
      } else {
        const t = scale - 1;
        const rubber = Math.sign(t) * Math.min(0.2, Math.abs(t) * 0.32);
        pendingLive.current = 1 + rubber;
      }
      schedule();
    };

    const begin = (source: PinchSource) => {
      if (pinchSource.current) return false;
      if (Date.now() < lockUntil.current) return false;
      pinchSource.current = source;
      startLevel.current = zoomRef.current;
      startWeek.current = weekRef.current;
      lastScale.current = 1;
      pendingLive.current = 1;
      pendingWeek.current = weekRef.current;
      consumed.current = false;
      return true;
    };

    const setFocusFromGesture = (event: Event) => {
      const e = event as Event & { clientX?: number; clientY?: number };
      if (typeof e.clientX === 'number' && typeof e.clientY === 'number') {
        pinchFocusRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    const setFocusFromTouches = (list: TouchList) => {
      if (list.length < 2) return;
      const a = list[0];
      const b = list[1];
      pinchFocusRef.current = midpoint(
        { x: a.clientX, y: a.clientY },
        { x: b.clientX, y: b.clientY },
      );
    };

    const finish = () => {
      if (!pinchSource.current) return;
      pinchSource.current = null;
      startDist.current = 0;
      pointers.current.clear();
      touches.current.clear();
      pinchFocusRef.current = null;

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
        const rawEnd = startWeek.current + (scale - 1) * 0.95;
        if (pendingWeek.current <= 0.03 && rawEnd <= -WEEK_TO_MONTH_OVERSHOOT) {
          stepFromStart(-1);
          changed = true;
        }
      } else if (z === 'day') {
        if (pendingWeek.current < WEEK_ZOOM_MAX - 0.02 || scale < 0.98) {
          setZoomRef.current('week');
        }
        changed = scale < 0.84;
      } else if (scale > 1.16) {
        stepFromStart(1);
        changed = true;
      } else if (scale < 0.84) {
        stepFromStart(-1);
        changed = true;
      }
      if (changed) lockUntil.current = Date.now() + 720;
    };

    const syncTouches = (list: TouchList) => {
      for (let i = 0; i < list.length; i += 1) {
        const t = list[i];
        touches.current.set(t.identifier, { x: t.clientX, y: t.clientY });
      }
    };

    const applyTwoTouchScale = () => {
      if (touches.current.size !== 2 || startDist.current <= 0) return;
      const [a, b] = [...touches.current.values()];
      applyScale(dist(a, b) / startDist.current);
    };

    const cleanups: Array<() => void> = [];

    if (isAppleMobile()) {
      const onStart = (event: Event) => {
        setFocusFromGesture(event);
        begin('gesture');
      };
      const onChange = (event: Event) => {
        if (pinchSource.current !== 'gesture') return;
        event.preventDefault();
        setFocusFromGesture(event);
        const scale = (event as Event & { scale?: number }).scale;
        if (typeof scale === 'number') applyScale(scale);
      };
      const onTouchStart = (event: TouchEvent) => {
        setFocusFromTouches(event.touches);
      };
      const onTouchMove = (event: TouchEvent) => {
        if (pinchSource.current !== 'gesture') return;
        setFocusFromTouches(event.touches);
      };
      const onEnd = (event: Event) => {
        if (pinchSource.current !== 'gesture') return;
        const scale = (event as Event & { scale?: number }).scale;
        if (typeof scale === 'number') lastScale.current = scale;
        finish();
      };
      el.addEventListener('gesturestart', onStart, { passive: false });
      el.addEventListener('gesturechange', onChange, { passive: false });
      el.addEventListener('gestureend', onEnd, { passive: false });
      el.addEventListener('touchstart', onTouchStart, { passive: true });
      el.addEventListener('touchmove', onTouchMove, { passive: true });
      cleanups.push(() => {
        el.removeEventListener('gesturestart', onStart);
        el.removeEventListener('gesturechange', onChange);
        el.removeEventListener('gestureend', onEnd);
        el.removeEventListener('touchstart', onTouchStart);
        el.removeEventListener('touchmove', onTouchMove);
      });
    } else if (isTouchMobile()) {
      const onTouchStart = (event: TouchEvent) => {
        for (let i = 0; i < event.changedTouches.length; i += 1) {
          const t = event.changedTouches[i];
          touches.current.set(t.identifier, { x: t.clientX, y: t.clientY });
        }
        if (touches.current.size === 2) {
          const [a, b] = [...touches.current.values()];
          startDist.current = dist(a, b);
          pinchFocusRef.current = midpoint(a, b);
          if (startDist.current > 0) begin('touch');
        }
      };

      const onTouchMove = (event: TouchEvent) => {
        if (pinchSource.current !== 'touch') return;
        syncTouches(event.touches);
        if (touches.current.size === 2 && startDist.current > 0) {
          event.preventDefault();
          const [a, b] = [...touches.current.values()];
          pinchFocusRef.current = midpoint(a, b);
          applyTwoTouchScale();
        }
      };

      const onTouchEnd = (event: TouchEvent) => {
        const hadTwo = touches.current.size >= 2;
        for (let i = 0; i < event.changedTouches.length; i += 1) {
          touches.current.delete(event.changedTouches[i].identifier);
        }
        if (hadTwo && touches.current.size < 2 && pinchSource.current === 'touch') {
          finish();
        }
      };

      el.addEventListener('touchstart', onTouchStart, { passive: true });
      el.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
      el.addEventListener('touchend', onTouchEnd, { passive: true });
      el.addEventListener('touchcancel', onTouchEnd, { passive: true });
      cleanups.push(() => {
        el.removeEventListener('touchstart', onTouchStart);
        el.removeEventListener('touchmove', onTouchMove, true);
        el.removeEventListener('touchend', onTouchEnd);
        el.removeEventListener('touchcancel', onTouchEnd);
      });
    } else {
      const onPointerDown = (event: PointerEvent) => {
        if (event.pointerType === 'mouse' && event.buttons !== 1) return;
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (pointers.current.size === 2) {
          const [a, b] = [...pointers.current.values()];
          startDist.current = dist(a, b);
          pinchFocusRef.current = midpoint(a, b);
          if (startDist.current > 0) begin('pointer');
        }
      };

      const onPointerMove = (event: PointerEvent) => {
        if (pinchSource.current !== 'pointer') return;
        if (!pointers.current.has(event.pointerId)) return;
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (pointers.current.size === 2 && startDist.current > 0) {
          event.preventDefault();
          const [a, b] = [...pointers.current.values()];
          pinchFocusRef.current = midpoint(a, b);
          applyScale(dist(a, b) / startDist.current);
        }
      };

      const onPointerUp = (event: PointerEvent) => {
        const hadTwo = pointers.current.size >= 2;
        pointers.current.delete(event.pointerId);
        if (hadTwo && pointers.current.size < 2 && pinchSource.current === 'pointer') {
          finish();
        }
      };

      el.addEventListener('pointerdown', onPointerDown);
      el.addEventListener('pointermove', onPointerMove, { passive: false });
      el.addEventListener('pointerup', onPointerUp);
      el.addEventListener('pointercancel', onPointerUp);
      cleanups.push(() => {
        el.removeEventListener('pointerdown', onPointerDown);
        el.removeEventListener('pointermove', onPointerMove);
        el.removeEventListener('pointerup', onPointerUp);
        el.removeEventListener('pointercancel', onPointerUp);
      });
    }

    return () => {
      for (const off of cleanups) off();
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [schedule]);

  return { ref, liveScale, pinching, pinchFocusRef };
}

export function zoomHint(level: ZoomLevel, weekZoomLevel = 0, viewportWidth = 390, locale: Locale = 'ru') {
  if (level === 'week' || level === 'day') return weekZoomHint(weekZoomLevel, viewportWidth, locale);
  return tLocale(locale, level === 'year' ? 'pinchYear' : 'pinchMonth');
}
