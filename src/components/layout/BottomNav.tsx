import { useApp } from '../../context/AppContext';
import { createInboxDraft } from '../../utils/hourSlot';
import './BottomNav.css';

const TABS = [
  { id: 'calendar', label: 'Календарь', icon: '📅', active: true },
  { id: 'growth', label: 'Развитие', icon: '📈', active: false },
  { id: 'vault', label: 'База', icon: '🔒', active: false },
  { id: 'wallet', label: 'Кошелёк', icon: '💰', active: false },
] as const;

export function BottomNav() {
  const { setScreen, setEditingTask, setSheetOpen } = useApp();

  const openNewTask = () => {
    setEditingTask(createInboxDraft());
    setSheetOpen(true);
  };

  return (
    <nav className="bottom-nav">
      {TABS.slice(0, 2).map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`bottom-nav__item ${tab.active ? 'bottom-nav__item--active' : ''}`}
          onClick={() => {
            if (tab.active) setScreen('calendar');
            else alert('Скоро в TiLi');
          }}
        >
          <span className="bottom-nav__icon">{tab.icon}</span>
          <span className="bottom-nav__label">{tab.label}</span>
        </button>
      ))}
      <button
        type="button"
        className="bottom-nav__item bottom-nav__item--add"
        aria-label="Новая задача"
        onClick={openNewTask}
      >
        <span className="bottom-nav__plus" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
      </button>
      {TABS.slice(2).map((tab) => (
        <button
          key={tab.id}
          type="button"
          className="bottom-nav__item"
          onClick={() => {
            alert('Скоро в TiLi');
          }}
        >
          <span className="bottom-nav__icon">{tab.icon}</span>
          <span className="bottom-nav__label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
