import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/useI18n';
import { isToday } from '../../utils/date';
import './CalendarViews.css';

export function YearView() {
  const { focusDate, setFocusDate, setZoom } = useApp();
  const { monthsShort } = useI18n();
  const year = focusDate.getFullYear();

  return (
    <div className="year-view">
      <h2 className="view-title">{year}</h2>
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
              <MiniMonthGrid year={year} month={m} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MiniMonthGrid({ year, month }: { year: number; month: number }) {
  const first = new Date(year, month, 1);
  const startDay = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="mini-month-grid">
      {cells.map((d, i) => {
        const cellDate = d === null ? null : new Date(year, month, d);
        const today = cellDate && isToday(cellDate);
        return (
        <span
          key={i}
          className={[
            'mini-month-grid__cell',
            d === null && 'mini-month-grid__cell--empty',
            d && d % 7 === 0 && !today && 'mini-month-grid__cell--sun',
            today && 'mini-month-grid__cell--today',
          ].filter(Boolean).join(' ')}
        >
          {d ?? ''}
        </span>
        );
      })}
    </div>
  );
}
