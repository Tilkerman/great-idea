import { useApp } from '../../context/AppContext';
import { MONTH_NAMES } from '../../constants/categories';
import { addDays, addMonths } from '../../utils/date';
import './Header.css';

export function Header() {
  const {
    focusDate, setFocusDate, setZoom, zoom,
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
        <img
          className="app-header__mark"
          src={`${import.meta.env.BASE_URL}logo-tili.png`}
          alt="TiLi"
          width={28}
          height={28}
        />
        <span className="app-header__logo">Calendar</span>
      </div>
      <div className="app-header__nav">
        <button type="button" className="app-header__arrow" onClick={prev} aria-label="Назад">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
            <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button type="button" className="app-header__period" onClick={goToday}>{title}</button>
        <button type="button" className="app-header__arrow" onClick={next} aria-label="Вперёд">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
            <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </header>
  );
}
