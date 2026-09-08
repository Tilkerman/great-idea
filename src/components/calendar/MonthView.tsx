import { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { MONTH_NAMES, MONTH_NAMES_SHORT } from '../../constants/categories';
import { CategoryDot } from '../tasks/TaskCard';
import type { Task } from '../../types';
import {
  getWeeksInMonth,
  isSameDay,
  toLocalDateString,
  formatDateRange,
} from '../../utils/date';
import './CalendarViews.css';

export function MonthView() {
  const { focusDate, setFocusDate, setZoom, tasks, settings } = useApp();
  const year = focusDate.getFullYear();
  const month = focusDate.getMonth();
  const weeks = useMemo(
    () => getWeeksInMonth(year, month, settings.weekStartsOn),
    [year, month, settings.weekStartsOn],
  );

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      const key = toLocalDateString(new Date(t.startAt));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return map;
  }, [tasks]);

  return (
    <div className="month-view">
      <div className="month-view__hero">
        <div className="month-view__mini-card">
          <span className="month-view__mini-title">{MONTH_NAMES[month]} {year}</span>
          <div className="month-view__mini-dots" />
        </div>
        <button
          type="button"
          className="month-view__pill"
          onClick={() => setZoom('week')}
        >
          {MONTH_NAMES_SHORT[month]}
        </button>
      </div>
      <div className="week-cards-scroll">
        {weeks.map((w) => {
          const weekTasks = tasks.filter((t) => {
            const d = new Date(t.startAt);
            return d >= w.start && d <= w.end;
          });
          return (
            <button
              key={w.start.toISOString()}
              type="button"
              className="week-card"
              onClick={() => {
                setFocusDate(w.start);
                setZoom('week');
              }}
            >
              <div className="week-card__header">
                {formatDateRange(w.start, w.end)}
              </div>
              <WeekDotGrid start={w.start} tasksByDay={tasksByDay} weekTasks={weekTasks} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekDotGrid({
  start,
  tasksByDay,
  weekTasks,
}: {
  start: Date;
  tasksByDay: Map<string, Task[]>;
  weekTasks: Task[];
}) {
  const { selectedDay, setSelectedDay, setFocusDate, setZoom } = useApp();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
  const maxRows = 6;

  return (
    <div className="week-dot-grid">
      {days.map((day) => {
        const key = toLocalDateString(day);
        const dayTasks = tasksByDay.get(key) ?? [];
        const selected = selectedDay && isSameDay(day, selectedDay);
        return (
          <div
            key={key}
            className={`week-dot-col ${selected ? 'week-dot-col--selected' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedDay(day);
              setFocusDate(day);
              setZoom('day');
            }}
            role="button"
            tabIndex={0}
          >
            {Array.from({ length: maxRows }, (_, row) => {
              const t = dayTasks[row];
              if (!t) return <span key={row} className="week-dot week-dot--empty" />;
              return (
                <span key={row} className="week-dot week-dot--filled">
                  <CategoryDot category={t.category} />
                </span>
              );
            })}
          </div>
        );
      })}
      {weekTasks.length === 0 && (
        <p className="week-card__empty">Нет задач</p>
      )}
    </div>
  );
}
