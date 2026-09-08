import { useApp } from '../../context/AppContext';
import './BottomNav.css';

const TABS = [
  { id: 'calendar', label: 'Календарь', icon: '📅', active: true },
  { id: 'growth', label: 'Развитие', icon: '📈', active: false },
  { id: 'wishes', label: 'Желания', icon: '⭐', active: false },
  { id: 'vault', label: 'База', icon: '🔒', active: false },
  { id: 'wallet', label: 'Кошелёк', icon: '💰', active: false },
] as const;

export function BottomNav() {
  const { setScreen } = useApp();

  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`bottom-nav__item ${tab.active ? 'bottom-nav__item--active' : ''}`}
          onClick={() => {
            if (tab.active) setScreen('calendar');
            else {
              // toast placeholder
              alert('Скоро в TiLi');
            }
          }}
        >
          <span className="bottom-nav__icon">{tab.icon}</span>
          <span className="bottom-nav__label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
