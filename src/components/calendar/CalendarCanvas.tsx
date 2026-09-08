import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { YearView } from './YearView';
import { MonthView } from './MonthView';
import { WeekView, DayView } from './WeekView';
import { usePinchZoom, zoomHint } from '../../hooks/usePinchZoom';
import { ZOOM_LABELS } from '../../constants/categories';
import { WEEK_ZOOM_MAX, WEEK_ZOOM_MIN } from '../../constants/weekZoom';
import type { ZoomLevel } from '../../types';
import './CalendarViews.css';

const ZOOM_ORDER: ZoomLevel[] = ['year', 'month', 'week', 'day'];

export function CalendarCanvas() {
  const { zoom, setZoom, weekZoom, weekZoomIn, weekZoomOut } = useApp();
  const { ref, liveScale, pinching } = usePinchZoom();
  const [viewportWidth, setViewportWidth] = useState(
    typeof window === 'undefined' ? 390 : window.innerWidth,
  );
  const prevZoom = useRef(zoom);
  const [enterKind, setEnterKind] = useState<'rubber-in' | 'rubber-out' | 'fade' | 'none'>('none');
  const [stageKey, setStageKey] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewportWidth(el.clientWidth));
    ro.observe(el);
    setViewportWidth(el.clientWidth);
    return () => ro.disconnect();
  }, [ref]);

  useEffect(() => {
    const prev = ZOOM_ORDER.indexOf(prevZoom.current);
    const next = ZOOM_ORDER.indexOf(zoom);
    if (prev !== next) {
      const from = prevZoom.current;
      const to = zoom;
      const rubber =
        (from === 'year' && to === 'month') ||
        (from === 'month' && to === 'year') ||
        (from === 'month' && to === 'week') ||
        (from === 'week' && to === 'month');
      if (rubber) setEnterKind(next > prev ? 'rubber-in' : 'rubber-out');
      else if ((from === 'week' && to === 'day') || (from === 'day' && to === 'week')) {
        setEnterKind('fade');
      } else {
        setEnterKind(next > prev ? 'rubber-in' : 'rubber-out');
      }
      setStageKey((k) => k + 1);
      prevZoom.current = zoom;
    }
  }, [zoom]);

  return (
    <div className={`calendar-canvas ${pinching ? 'is-pinching' : ''}`} ref={ref}>
      <div className="zoom-tabs">
        {ZOOM_ORDER.map((z) => (
          <button
            key={z}
            type="button"
            className={`zoom-tab ${zoom === z ? 'zoom-tab--active' : ''}`}
            onClick={() => setZoom(z)}
          >
            {ZOOM_LABELS[z]}
          </button>
        ))}
      </div>
      <div className="zoom-bar">
        <p className="zoom-hint">{zoomHint(zoom, weekZoom, viewportWidth)}</p>
        {zoom === 'week' && (
          <div className="week-zoom-controls">
            <button
              type="button"
              className="week-zoom-btn"
              disabled={weekZoom <= WEEK_ZOOM_MIN}
              onClick={weekZoomOut}
              aria-label="Уменьшить"
            >
              −
            </button>
            <span className="week-zoom-level">{Math.round(weekZoom * 100)}%</span>
            <button
              type="button"
              className="week-zoom-btn"
              disabled={weekZoom >= WEEK_ZOOM_MAX}
              onClick={weekZoomIn}
              aria-label="Увеличить"
            >
              +
            </button>
          </div>
        )}
      </div>
      <div className="calendar-canvas__body">
        <div
          key={stageKey}
          className={`calendar-stage calendar-stage--${enterKind}`}
          style={pinching ? { transform: `scale(${liveScale})` } : undefined}
          onAnimationEnd={(e) => {
            if (e.target === e.currentTarget) setEnterKind('none');
          }}
        >
          {zoom === 'year' && <YearView />}
          {zoom === 'month' && <MonthView />}
          {zoom === 'week' && <WeekView viewportWidth={viewportWidth} />}
          {zoom === 'day' && <DayView />}
        </div>
      </div>
    </div>
  );
}
