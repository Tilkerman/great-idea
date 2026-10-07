import { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/useI18n';
import type { Task, TaskCategory } from '../../types';
import {
  getMonthCalendarCells,
  isPastDay,
  isToday,
  toLocalDateString,
} from '../../utils/date';
import './CalendarViews.css';

const CATEGORY_ORDER: TaskCategory[] = ['work', 'personal', 'family'];

function countByCategory(dayTasks: Task[]) {
  const counts: Record<TaskCategory, number> = { work: 0, personal: 0, family: 0 };
  for (const task of dayTasks) counts[task.category] += 1;
  return counts;
}

const EMPTY_COL_PCT = 8;

/** Three columns per day: empty = short stub; filled share the rest by task count. */
function categoryColumnHeights(counts: Record<TaskCategory, number>) {
  const total = CATEGORY_ORDER.reduce((s, c) => s + counts[c], 0);
  const emptyCount = CATEGORY_ORDER.filter((c) => counts[c] === 0).length;
  const pool = Math.max(0, 100 - EMPTY_COL_PCT * emptyCount);
  return CATEGORY_ORDER.map((cat) => {
    const n = counts[cat];
    if (n <= 0) return EMPTY_COL_PCT;
    if (total <= 0) return EMPTY_COL_PCT;
    return Math.round((n / total) * pool);
  });
}

export function MonthView() {
  const { focusDate, setFocusDate, setZoom, tasks, settings } = useApp();
  const { t, months, weekdaysShort } = useI18n();
  const year = focusDate.getFullYear();
  const month = focusDate.getMonth();

  const cells = useMemo(
    () => getMonthCalendarCells(year, month, settings.weekStartsOn),
    [year, month, settings.weekStartsOn],
  );

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      if (task.status === 'completed') continue;
      const key = toLocalDateString(new Date(task.startAt));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    }
    return map;
  }, [tasks]);

  const weekdayLabels = settings.weekStartsOn === 1
    ? weekdaysShort
    : [weekdaysShort[6], ...weekdaysShort.slice(0, 6)];

  const openDay = (date: Date) => {
    setFocusDate(date);
    setZoom('day');
  };

  return (
    <div className="month-view">
      <header className="month-calendar__header">
        <h2 className="month-calendar__title">{months[month]} {year}</h2>
        <button
          type="button"
          className="month-calendar__today"
          onClick={() => openDay(new Date())}
        >
          {t('goToday')}
        </button>
      </header>
      <div className="month-calendar">
        <div className="month-calendar__weekdays">
          {weekdayLabels.map((label) => (
            <div key={label} className="month-calendar__weekday">{label}</div>
          ))}
        </div>
        <div className="month-calendar__grid">
          {cells.map(({ date, inMonth }) => {
            const key = toLocalDateString(date);
            const dayTasks = inMonth ? (tasksByDay.get(key) ?? []) : [];
            const counts = countByCategory(dayTasks);
            const colHeights = categoryColumnHeights(counts);
            const total = counts.work + counts.personal + counts.family;
            const today = isToday(date);
            const past = isPastDay(date);
            return (
              <button
                key={key}
                type="button"
                className={[
                  'month-calendar__day',
                  !inMonth && 'month-calendar__day--outside',
                  today && 'month-calendar__day--today',
                  past && inMonth && 'month-calendar__day--past',
                  total > 0 && 'month-calendar__day--has-tasks',
                ].filter(Boolean).join(' ')}
                onClick={() => openDay(date)}
              >
                <span className="month-calendar__day-num">{date.getDate()}</span>
                {inMonth && (
                  <div className="month-calendar__cols" aria-hidden>
                    {CATEGORY_ORDER.map((cat, i) => {
                      const n = counts[cat];
                      return (
                        <span key={cat} className="month-calendar__col">
                          <span
                            className="month-calendar__col-fill"
                            data-cat={cat}
                            data-empty={n === 0 ? 'true' : undefined}
                            style={{ height: `${colHeights[i]}%` }}
                          />
                        </span>
                      );
                    })}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
