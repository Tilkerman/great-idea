import { useApp } from '../../context/AppContext';
import { MONTH_NAMES } from '../../constants/categories';
import { addDays, addMonths } from '../../utils/date';
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
    else if (zoom === 'day') setFocusDate(addDays(focusDate, -1));
    else setFocusDate(addDays(focusDate, -7));
  };

  const next = () => {
    if (zoom === 'year') setFocusDate(new Date(focusDate.getFullYear() + 1, 0, 1));
    else if (zoom === 'month') setFocusDate(addMonths(focusDate, 1));
    else if (zoom === 'day') setFocusDate(addDays(focusDate, 1));
    else setFocusDate(addDays(focusDate, 7));
  };

  const title = zoom === 'year'
    ? String(focusDate.getFullYear())
    : zoom === 'day'
      ? focusDate.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' })
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
        <button type="button" className="app-header__icon" onClick={() => setScreen('settings')} aria-label="Настройки">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <path
              d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}
