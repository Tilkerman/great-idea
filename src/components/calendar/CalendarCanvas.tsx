import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { YearView } from './YearView';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { usePinchZoom } from '../../hooks/usePinchZoom';
import { useLayoutMode } from '../../hooks/useLayoutMode';
import { useDesktopCalendarZoom } from '../../hooks/useDesktopCalendarZoom';
import { emptyWeekPinchLive, type WeekPinchLive } from '../../utils/weekPinchLive';
import { useI18n } from '../../i18n/useI18n';
import type { ZoomLevel } from '../../types';
import './CalendarViews.css';

const ZOOM_ORDER: ZoomLevel[] = ['year', 'month', 'week', 'day'];
const CHROME_SLIM_ENTER_PX = 16;
const CHROME_SLIM_LEAVE_PX = 96;

export function CalendarCanvas() {
  const { zoom, setZoom, setFocusDate } = useApp();
  const { t } = useI18n();
  const { isDesktopLayout } = useLayoutMode();
  const weekPinchLive = useRef<WeekPinchLive>(emptyWeekPinchLive());
  const { ref, liveScale, pinching } = usePinchZoom(weekPinchLive);
  useDesktopCalendarZoom(ref, isDesktopLayout);
  const [viewportWidth, setViewportWidth] = useState(
    typeof window === 'undefined' ? 390 : window.innerWidth,
  );
  const prevZoom = useRef(zoom);
  const [enterKind, setEnterKind] = useState<'rubber-in' | 'rubber-out' | 'fade' | 'none'>('none');
  const [stageKey, setStageKey] = useState(0);
  const [chromeSlim, setChromeSlim] = useState(false);
  const chromeSlimRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewportWidth(el.clientWidth));
    ro.observe(el);
    setViewportWidth(el.clientWidth);
    return () => ro.disconnect();
  }, [ref]);

  useEffect(() => {
    chromeSlimRef.current = false;
    setChromeSlim(false);
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

  const onHoursScroll = useCallback((grid: { scrollTop: number; clientHeight: number; scrollHeight: number }) => {
    if (pinching || isDesktopLayout) return;
    const max = Math.max(0, grid.scrollHeight - grid.clientHeight);
    if (max <= 8) return;
    const fromEnd = max - grid.scrollTop;
    const slim = chromeSlimRef.current
      ? fromEnd < CHROME_SLIM_LEAVE_PX
      : fromEnd <= CHROME_SLIM_ENTER_PX;
    if (chromeSlimRef.current === slim) return;
    chromeSlimRef.current = slim;
    setChromeSlim(slim);
  }, [pinching, isDesktopLayout]);

  return (
    <div
      className={[
        'calendar-canvas',
        pinching && 'is-pinching',
        chromeSlim && 'calendar-canvas--chrome-slim',
      ].filter(Boolean).join(' ')}
      ref={ref}
    >
      <div className="zoom-tabs" aria-hidden={chromeSlim || undefined}>
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
      <div className={`calendar-canvas__body ${zoom === 'week' || zoom === 'day' ? 'calendar-canvas__body--flush' : ''}`}>
        <div
          key={stageKey}
          className={`calendar-stage calendar-stage--${enterKind}`}
          style={pinching && Math.abs(liveScale - 1) > 0.002 ? { transform: `scale(${liveScale})` } : undefined}
          onAnimationEnd={(e) => {
            if (e.target === e.currentTarget) setEnterKind('none');
          }}
        >
          {zoom === 'year' && <YearView />}
          {zoom === 'month' && <MonthView />}
          {(zoom === 'week' || zoom === 'day') && (
            <WeekView
              viewportWidth={viewportWidth}
              pinching={pinching}
              weekPinchLive={weekPinchLive}
              chromeSlim={chromeSlim}
              onHoursScroll={onHoursScroll}
            />
          )}
        </div>
      </div>
    </div>
  );
}
