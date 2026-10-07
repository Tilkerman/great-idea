import { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/useI18n';
import { isToday, toLocalDateString } from '../../utils/date';
import './CalendarViews.css';

export function YearView() {
  const { focusDate, setFocusDate, setZoom, tasks, settings } = useApp();
  const { monthsShort, weekdaysShort } = useI18n();
  const year = focusDate.getFullYear();

  const taskDays = useMemo(() => {
    const set = new Set<string>();
    for (const t of tasks) {
      if (t.status === 'completed') continue;
      set.add(toLocalDateString(new Date(t.startAt)));
    }
    return set;
  }, [tasks]);

  return (
    <div className="year-view">
      <h2 className="year-view__title">{year}</h2>
      <div className="year-grid">
        {Array.from({ length: 12 }, (_, m) => {
          const d = new Date(year, m, 1);
          return (
            <button
              key={m}
              type="button"
              className="year-mini-month"
              onClick={() => {
                setFocusDate(d);
                setZoom('month');
              }}
            >
              <span className="year-mini-month__label">{monthsShort[m]}</span>
              <MiniMonthGrid
                year={year}
                month={m}
                weekStartsOn={settings.weekStartsOn}
                weekdayLabels={weekdaysShort}
                taskDays={taskDays}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MiniMonthGrid({
  year,
  month,
  weekStartsOn,
  weekdayLabels,
  taskDays,
}: {
  year: number;
  month: number;
  weekStartsOn: 0 | 1;
  weekdayLabels: readonly string[];
  taskDays: Set<string>;
}) {
  const first = new Date(year, month, 1);
  const startDay = weekStartsOn === 1
    ? (first.getDay() + 6) % 7
    : first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const labels = weekStartsOn === 1
    ? weekdayLabels
    : [weekdayLabels[6], ...weekdayLabels.slice(0, 6)];

  return (
    <div className="mini-month">
      <div className="mini-month__weekdays" aria-hidden>
        {labels.map((w) => (
          <span key={w} className="mini-month__weekday">{w.slice(0, 1)}</span>
        ))}
      </div>
      <div className="mini-month-grid">
        {cells.map((d, i) => {
          if (d === null) {
            return <span key={i} className="mini-month-grid__cell mini-month-grid__cell--empty" />;
          }
          const cellDate = new Date(year, month, d);
          const today = isToday(cellDate);
          const dow = weekStartsOn === 1
            ? (cellDate.getDay() + 6) % 7
            : cellDate.getDay();
          const weekend = weekStartsOn === 1 ? dow >= 5 : dow === 0 || dow === 6;
          const busy = taskDays.has(toLocalDateString(cellDate));
          return (
            <span
              key={i}
              className={[
                'mini-month-grid__cell',
                weekend && !today && 'mini-month-grid__cell--weekend',
                today && 'mini-month-grid__cell--today',
                busy && 'mini-month-grid__cell--busy',
              ].filter(Boolean).join(' ')}
            >
              {d}
            </span>
          );
        })}
      </div>
    </div>
  );
}
