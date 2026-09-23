import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { YearView } from './YearView';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { usePinchZoom } from '../../hooks/usePinchZoom';
import { WEEK_ZOOM_MAX, WEEK_ZOOM_MIN, weekZoomHint, weekZoomPercent } from '../../constants/weekZoom';
import { useI18n } from '../../i18n/useI18n';
import type { ZoomLevel } from '../../types';
import './CalendarViews.css';

const ZOOM_ORDER: ZoomLevel[] = ['year', 'month', 'week', 'day'];

export function CalendarCanvas() {
  const { zoom, setZoom, setFocusDate, weekZoom, weekZoomIn, weekZoomOut } = useApp();
  const { t, locale } = useI18n();
  const { ref, liveScale, pinching, pinchFocusRef } = usePinchZoom();
  const [viewportWidth, setViewportWidth] = useState(
    typeof window === 'undefined' ? 390 : window.innerWidth,
  );
  const prevZoom = useRef(zoom);
  const lastHoursTop = useRef(0);
  const lastHoursDy = useRef(0);
  const chromeSlimRef = useRef(false);
  const [enterKind, setEnterKind] = useState<'rubber-in' | 'rubber-out' | 'fade' | 'none'>('none');
  const [stageKey, setStageKey] = useState(0);
  const [showDevZoomBar, setShowDevZoomBar] = useState(false);

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
      const weekDay =
        (from === 'week' && to === 'day') || (from === 'day' && to === 'week');
      prevZoom.current = zoom;
      if (weekDay) {
        setEnterKind('none');
        return;
      }
      const rubber =
        (from === 'year' && to === 'month') ||
        (from === 'month' && to === 'year') ||
        (from === 'month' && to === 'week') ||
        (from === 'week' && to === 'month');
      if (rubber) setEnterKind(next > prev ? 'rubber-in' : 'rubber-out');
      else setEnterKind(next > prev ? 'rubber-in' : 'rubber-out');
      setStageKey((k) => k + 1);
    }
  }, [zoom]);

  useEffect(() => {
    setShowDevZoomBar(
      Boolean(import.meta.env.DEV && window.matchMedia('(pointer: fine)').matches),
    );
  }, []);

  useEffect(() => {
    chromeSlimRef.current = false;
    lastHoursTop.current = 0;
    lastHoursDy.current = 0;
    ref.current?.classList.remove('calendar-canvas--chrome-slim');
  }, [zoom, ref]);

  const applyChromeSlim = useCallback((slim: boolean) => {
    if (chromeSlimRef.current === slim) return;
    chromeSlimRef.current = slim;
    ref.current?.classList.toggle('calendar-canvas--chrome-slim', slim);
  }, [ref]);

  const onHoursScroll = useCallback((scrollTop: number) => {
    if (pinching) return;
    lastHoursDy.current = scrollTop - lastHoursTop.current;
    lastHoursTop.current = scrollTop;
    if (scrollTop <= 16) {
      applyChromeSlim(false);
      return;
    }
    if (lastHoursDy.current > 10) applyChromeSlim(true);
    else if (lastHoursDy.current < -10) applyChromeSlim(false);
  }, [pinching, applyChromeSlim]);

  return (
    <div
      className={[
        'calendar-canvas',
        pinching && 'is-pinching',
        showDevZoomBar && 'calendar-canvas--dev-zoom',
      ].filter(Boolean).join(' ')}
      ref={ref}
    >
      <div className="zoom-tabs">
        {ZOOM_ORDER.map((z) => (
          <button
            key={z}
            type="button"
            className={`zoom-tab ${zoom === z ? 'zoom-tab--active' : ''}`}
            onClick={() => {
              if (z === 'day') setFocusDate(new Date());
              setZoom(z);
            }}
          >
            {t(
              z === 'year' ? 'zoomYear'
                : z === 'month' ? 'zoomMonth'
                  : z === 'week' ? 'zoomWeek'
                    : 'zoomDay',
            )}
          </button>
        ))}
      </div>
      {showDevZoomBar && (
      <div className="zoom-bar">
        <p className="zoom-hint">
          {zoom === 'year' ? t('pinchYear')
            : zoom === 'month' ? t('pinchMonth')
              : weekZoomHint(weekZoom, viewportWidth, locale)}
        </p>
        {(zoom === 'week' || zoom === 'day') && (
          <div className="week-zoom-controls">
            <button
              type="button"
              className="week-zoom-btn"
              disabled={weekZoom <= WEEK_ZOOM_MIN}
              onClick={weekZoomOut}
              aria-label={t('zoomOut')}
            >
              −
            </button>
            <span className="week-zoom-level">{weekZoomPercent(weekZoom)}%</span>
            <button
              type="button"
              className="week-zoom-btn"
              disabled={weekZoom >= WEEK_ZOOM_MAX}
              onClick={weekZoomIn}
              aria-label={t('zoomIn')}
            >
              +
            </button>
          </div>
        )}
      </div>
      )}
      <div className={`calendar-canvas__body ${zoom === 'week' || zoom === 'day' ? 'calendar-canvas__body--flush' : ''}`}>
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
          {(zoom === 'week' || zoom === 'day') && (
            <WeekView
              viewportWidth={viewportWidth}
              onHoursScroll={onHoursScroll}
              pinching={pinching}
              pinchFocusRef={pinchFocusRef}
            />
          )}
        </div>
      </div>
    </div>
  );
}
