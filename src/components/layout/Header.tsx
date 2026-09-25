import { useApp } from '../../context/AppContext';
import { addDays, addMonths, formatWeekHeaderTitle } from '../../utils/date';
import { useI18n } from '../../i18n/useI18n';
import './Header.css';

export function Header() {
  const {
    focusDate, setFocusDate, setZoom, zoom, settings,
  } = useApp();
  const { t, months, monthsGen, dateTag } = useI18n();

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
      ? focusDate.toLocaleDateString(dateTag, { weekday: 'short', day: 'numeric', month: 'long' })
      : zoom === 'week'
        ? formatWeekHeaderTitle(focusDate, settings.weekStartsOn, dateTag, monthsGen)
        : `${months[focusDate.getMonth()]} ${focusDate.getFullYear()}`;

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <img
          className="app-header__logo"
          src={`${import.meta.env.BASE_URL}logo-tili-header.png`}
          alt="TiLi Calendar"
          width={189}
          height={93}
        />
      </div>
      <div className="app-header__nav">
        <button type="button" className="app-header__arrow" onClick={prev} aria-label={t('headerBack')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
            <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button type="button" className="app-header__period" onClick={goToday}>{title}</button>
        <button type="button" className="app-header__arrow" onClick={next} aria-label={t('headerForward')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
            <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </header>
  );
}
