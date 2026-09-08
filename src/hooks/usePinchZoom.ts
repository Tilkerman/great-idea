import { usePinch } from '@use-gesture/react';
import { useRef } from 'react';
import { useApp } from '../context/AppContext';
import type { ZoomLevel } from '../types';
import { WEEK_ZOOM_MAX, WEEK_ZOOM_MIN, weekZoomHint } from '../constants/weekZoom';

export function usePinchZoom() {
  const {
    zoom, zoomIn, zoomOut, weekZoom, weekZoomIn, weekZoomOut,
  } = useApp();
  const ref = useRef<HTMLDivElement>(null);

  usePinch(
    ({ offset: [scale], last, velocity: [, vy] }) => {
      if (!last) return;
      const pinchIn = scale > 1.12 || vy > 0.45;
      const pinchOut = scale < 0.88 || vy < -0.45;
      if (!pinchIn && !pinchOut) return;

      if (zoom === 'week') {
        if (pinchIn) {
          if (weekZoom < WEEK_ZOOM_MAX) weekZoomIn();
          else zoomIn();
        } else if (weekZoom > WEEK_ZOOM_MIN) {
          weekZoomOut();
        } else {
          zoomOut();
        }
        return;
      }

      if (pinchIn) zoomIn();
      else if (pinchOut) zoomOut();
    },
    {
      target: ref,
      scaleBounds: { min: 0.65, max: 1.5 },
      rubberband: true,
    },
  );

  return { ref, zoom };
}

export function zoomHint(level: ZoomLevel, weekZoomLevel = 1) {
  if (level === 'week') return weekZoomHint(weekZoomLevel);
  const hints: Record<Exclude<ZoomLevel, 'week'>, string> = {
    year: 'Щипок внутрь → месяц',
    month: 'Щипок внутрь → неделя · наружу → год',
    day: 'Щипок наружу → неделя',
  };
  return hints[level];
}
