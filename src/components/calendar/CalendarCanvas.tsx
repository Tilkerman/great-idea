import { useApp } from '../../context/AppContext';
import { YearView } from './YearView';
import { MonthView } from './MonthView';
import { WeekView, DayView } from './WeekView';
import { usePinchZoom, zoomHint } from '../../hooks/usePinchZoom';
import { ZOOM_LABELS } from '../../constants/categories';
import { WEEK_ZOOM_MAX, WEEK_ZOOM_MIN } from '../../constants/weekZoom';
import './CalendarViews.css';

export function CalendarCanvas() {
  const { zoom, setZoom, weekZoom, weekZoomIn, weekZoomOut } = useApp();
  const { ref } = usePinchZoom();

  return (
    <div className="calendar-canvas" ref={ref}>
      <div className="zoom-tabs">
        {(['year', 'month', 'week', 'day'] as const).map((z) => (
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
        <p className="zoom-hint">{zoomHint(zoom, weekZoom)}</p>
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
            <span className="week-zoom-level">{weekZoom}/{WEEK_ZOOM_MAX}</span>
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
        {zoom === 'year' && <YearView />}
        {zoom === 'month' && <MonthView />}
        {zoom === 'week' && <WeekView />}
        {zoom === 'day' && <DayView />}
      </div>
    </div>
  );
}
