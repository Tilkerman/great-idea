import { useApp } from '../../context/AppContext';
import { MONTH_NAMES } from '../../constants/categories';
import { addMonths, toLocalDateString } from '../../utils/date';
import { createDraftTask, getTasksInHour } from '../../utils/hourSlot';
import './Header.css';

export function Header() {
  const {
    focusDate, setFocusDate, setScreen, setZoom, zoom,
  } = useApp();

  const goToday = () => {
    setFocusDate(new Date());
    if (zoom === 'year' || zoom === 'month') setZoom('week');
  };

  const prev = () => {
    if (zoom === 'year') setFocusDate(new Date(focusDate.getFullYear() - 1, 0, 1));
    else if (zoom === 'month') setFocusDate(addMonths(focusDate, -1));
    else setFocusDate(new Date(focusDate.getTime() - 7 * 86400000));
  };

  const next = () => {
    if (zoom === 'year') setFocusDate(new Date(focusDate.getFullYear() + 1, 0, 1));
    else if (zoom === 'month') setFocusDate(addMonths(focusDate, 1));
    else setFocusDate(new Date(focusDate.getTime() + 7 * 86400000));
  };

  const title = zoom === 'year'
    ? String(focusDate.getFullYear())
    : `${MONTH_NAMES[focusDate.getMonth()]} ${focusDate.getFullYear()}`;

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <span className="app-header__logo">TiLi</span>
      </div>
      <div className="app-header__nav">
        <button type="button" className="app-header__arrow" onClick={prev} aria-label="Назад">‹</button>
        <button type="button" className="app-header__period" onClick={goToday}>{title}</button>
        <button type="button" className="app-header__arrow" onClick={next} aria-label="Вперёд">›</button>
      </div>
      <div className="app-header__actions">
        <button type="button" className="app-header__icon" onClick={() => setScreen('search')} aria-label="Поиск">🔍</button>
        <button type="button" className="app-header__icon" onClick={() => setScreen('settings')} aria-label="Настройки">⚙️</button>
      </div>
    </header>
  );
}

export function Fab() {
  const { setEditingTask, setSheetOpen, focusDate, settings, tasks } = useApp();

  return (
    <button
      type="button"
      className="fab"
      aria-label="Добавить задачу"
      onClick={() => {
        const hour = settings.dayStartHour + 1;
        const day = new Date(focusDate);
        day.setHours(0, 0, 0, 0);
        const dateStr = toLocalDateString(day);
        const existing = getTasksInHour(tasks, dateStr, hour);
        setEditingTask(createDraftTask(day, hour, existing));
        setSheetOpen(true);
      }}
    >
      +
    </button>
  );
}
