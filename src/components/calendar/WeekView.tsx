import { useCallback, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { useApp } from '../../context/AppContext';
import { WEEKDAY_NAMES, WEEKDAY_SHORT } from '../../constants/categories';
import { getWeekZoomMetrics, WEEK_ZOOM_ADD_MIN, WEEK_ZOOM_BADGE_MIN, WEEK_ZOOM_DELETE_MIN, WEEK_ZOOM_DESC_MIN, WEEK_ZOOM_TIME_GROW_MAX, WEEK_ZOOM_TIME_GROW_MIN, WEEK_ZOOM_TITLE_MIN, WEEK_ZOOM_TITLE_ONLY_MAX, WEEK_ZOOM_WEEKDAY_FULL_MIN, weekZoomAtLeast, weekZoomPercent } from '../../constants/weekZoom';
import { HourSlot } from '../tasks/HourSlot';
import {
  addDays,
  getHoursRange,
  getWeekDays,
  hourRangeLabels,
  toLocalDateString,
} from '../../utils/date';
import type { Task } from '../../types';
import './CalendarViews.css';

export function WeekView({ viewportWidth }: { viewportWidth: number }) {
  const {
    focusDate, tasks, settings, weekZoom, setEditingTask, setSheetOpen,
    requestDelete,
  } = useApp();

  const headerScrollRef = useRef<HTMLDivElement>(null);
  const gridScrollRef = useRef<HTMLDivElement>(null);
  const timeScrollRef = useRef<HTMLDivElement>(null);

  const { colWidth, rowHeight } = getWeekZoomMetrics(weekZoom, viewportWidth);
  /** До 60% × мешает на мелких карточках; с 60% и на дне — виден */
  const showSlotDelete = weekZoomAtLeast(weekZoom, WEEK_ZOOM_DELETE_MIN);
  const showSlotBadge = weekZoomAtLeast(weekZoom, WEEK_ZOOM_BADGE_MIN);
  const showSlotTitle = weekZoomAtLeast(weekZoom, WEEK_ZOOM_TITLE_MIN);
  const showSlotAdd = weekZoomAtLeast(weekZoom, WEEK_ZOOM_ADD_MIN);
  const zoomPct = weekZoomPercent(weekZoom);
  const titlesOnly = showSlotTitle && zoomPct <= Math.round(WEEK_ZOOM_TITLE_ONLY_MAX * 100);
  const showSlotDesc = weekZoomAtLeast(weekZoom, WEEK_ZOOM_DESC_MIN);

  const days = useMemo(
    () => getWeekDays(focusDate, settings.weekStartsOn),
    [focusDate, settings.weekStartsOn],
  );
  const hours = useMemo(
    () => getHoursRange(settings.dayStartHour, settings.dayEndHour),
    [settings.dayStartHour, settings.dayEndHour],
  );

  const tasksBySlot = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!settings.showCompleted && t.status === 'completed') continue;
      const d = new Date(t.startAt);
      const key = `${toLocalDateString(d)}-${d.getHours()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    for (const list of map.values()) list.sort((a, b) => a.order - b.order);
    return map;
  }, [tasks, settings.showCompleted]);

  const openDraft = (draft: Task) => {
    setEditingTask(draft);
    setSheetOpen(true);
  };

  const syncScroll = useCallback((source: 'grid' | 'time') => {
    const grid = gridScrollRef.current;
    const time = timeScrollRef.current;
    const header = headerScrollRef.current;
    if (!grid || !time || !header) return;
    if (source === 'grid') {
      time.scrollTop = grid.scrollTop;
      header.scrollLeft = grid.scrollLeft;
    } else {
      grid.scrollTop = time.scrollTop;
    }
  }, []);

  const showFullWeekday = weekZoomAtLeast(weekZoom, WEEK_ZOOM_WEEKDAY_FULL_MIN);
  const gridWidth = colWidth * days.length;
  const timeT = Math.max(0, Math.min(weekZoom, WEEK_ZOOM_TIME_GROW_MAX) - WEEK_ZOOM_TIME_GROW_MIN);
  const timeScaleY = 1.22 + timeT * 1.1;
  const timeFontPx = 12 + timeT * 10;

  const style = {
    '--week-col-width': `${colWidth}px`,
    '--week-row-height': `${rowHeight}px`,
    '--week-time-y': String(timeScaleY),
    '--week-time-size': `${timeFontPx}px`,
  } as CSSProperties;

  return (
    <div className={`week-view ${titlesOnly ? 'week-view--sm-title' : ''}`} style={style}>
      <div className="week-view__header-row">
        <div className="week-view__time-spacer" />
        <div
          className="week-view__header-scroll"
          ref={headerScrollRef}
        >
          <div className="week-view__header-inner" style={{ width: gridWidth }}>
            {days.map((d) => {
              const wi = (d.getDay() + 6) % 7;
              const raw = WEEKDAY_NAMES[wi] ?? '';
              const name = showFullWeekday
                ? raw.charAt(0) + raw.slice(1).toLowerCase()
                : WEEKDAY_SHORT[wi];
              return (
                <div key={d.toISOString()} className="week-view__day-head">
                  <span className="week-view__day-name">{name}</span>
                  <span className="week-view__day-num">{d.getDate()}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="week-view__body">
        <div
          className="week-view__time-col"
          ref={timeScrollRef}
          onScroll={() => syncScroll('time')}
        >
          {hours.map((h) => {
            const { start, end } = hourRangeLabels(h);
            return (
              <div key={h} className="week-view__time-label">
                <span className="week-view__time-start">{start}</span>
                <span className="week-view__time-dash" aria-hidden>–</span>
                <span className="week-view__time-end">{end}</span>
              </div>
            );
          })}
        </div>

        <div
          className={`week-view__grid-scroll ${weekZoom > 0.45 ? 'week-view__grid-scroll--snap' : ''}`}
          ref={gridScrollRef}
          onScroll={() => syncScroll('grid')}
        >
          <div className="week-view__grid" style={{ width: gridWidth }}>
            {days.map((day) => (
              <div key={day.toISOString()} className="week-view__col">
                {hours.map((h) => {
                  const key = `${toLocalDateString(day)}-${h}`;
                  const slotTasks = tasksBySlot.get(key) ?? [];
                  return (
                    <div key={h} className="week-view__slot">
                      <HourSlot
                        day={day}
                        hour={h}
                        tasks={slotTasks}
                        compact
                        onTaskClick={(task) => {
                          setEditingTask(task);
                          setSheetOpen(true);
                        }}
                        onTaskDelete={(task) => requestDelete(task)}
                        showDelete={showSlotDelete}
                        showBadge={showSlotBadge}
                        showTitle={showSlotTitle}
                        showDesc={showSlotDesc}
                        showAddStrip={showSlotAdd}
                        onAdd={openDraft}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DayView() {
  const {
    focusDate, setFocusDate, tasks, settings, setEditingTask, setSheetOpen, requestDelete,
  } = useApp();
  const hours = useMemo(
    () => getHoursRange(settings.dayStartHour, settings.dayEndHour),
    [settings.dayStartHour, settings.dayEndHour],
  );
  const dateStr = toLocalDateString(focusDate);
  const drag = useRef<{ id: number; x: number; y: number; locked?: 'x' | 'y' } | null>(null);
  const offsetRef = useRef(0);
  const [offsetX, setOffsetX] = useState(0);

  const tasksByHour = useMemo(() => {
    const map = new Map<number, Task[]>();
    for (const t of tasks) {
      if (!settings.showCompleted && t.status === 'completed') continue;
      const d = new Date(t.startAt);
      if (toLocalDateString(d) !== dateStr) continue;
      const h = d.getHours();
      if (!map.has(h)) map.set(h, []);
      map.get(h)!.push(t);
    }
    for (const list of map.values()) list.sort((a, b) => a.order - b.order);
    return map;
  }, [tasks, dateStr, settings.showCompleted]);

  const onPointerDown = (e: ReactPointerEvent) => {
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const start = drag.current;
    if (!start || start.id !== e.pointerId) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (!start.locked) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      start.locked = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (start.locked === 'x') {
      e.preventDefault();
      offsetRef.current = dx;
      setOffsetX(dx);
    }
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    const start = drag.current;
    if (!start || start.id !== e.pointerId) return;
    const dx = offsetRef.current;
    drag.current = null;
    offsetRef.current = 0;
    setOffsetX(0);
    if (start.locked === 'x' && Math.abs(dx) > 56) {
      setFocusDate(addDays(focusDate, dx < 0 ? 1 : -1));
    }
  };

  return (
    <div
      className={`day-view ${offsetX !== 0 ? 'day-view--dragging' : ''}`}
      style={{ transform: `translateX(${offsetX * 0.35}px)` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {hours.map((h) => {
        const slotTasks = tasksByHour.get(h) ?? [];
        if (settings.hideEmptyHours && slotTasks.length === 0) return null;
        const { start, end } = hourRangeLabels(h);
        return (
          <div key={h} className="day-view__row">
            <div className="day-view__time">
              <span className="week-view__time-start">{start}</span>
              <span className="week-view__time-dash" aria-hidden>–</span>
              <span className="week-view__time-end">{end}</span>
            </div>
            <div className="day-view__slot">
              <HourSlot
                day={focusDate}
                hour={h}
                tasks={slotTasks}
                onTaskClick={(task) => {
                  setEditingTask(task);
                  setSheetOpen(true);
                }}
                onTaskDelete={(task) => requestDelete(task)}
                onAdd={(draft) => {
                  setEditingTask(draft);
                  setSheetOpen(true);
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
