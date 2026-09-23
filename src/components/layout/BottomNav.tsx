import { useApp } from '../../context/AppContext';
import { createInboxDraft } from '../../utils/hourSlot';
import { useI18n } from '../../i18n/useI18n';
import { useLumiHost } from '../../lumi/LumiHost';
import './BottomNav.css';

const TAB_IDS = ['calendar', 'growth', 'settings', 'profile'] as const;

export function BottomNav() {
  const { screen, setScreen, mainTab, setEditingTask, setSheetOpen } = useApp();
  const { api: lumi } = useLumiHost();
  const { t } = useI18n();

  const openNew = () => {
    if (screen === 'lumi' || mainTab === 'lumi') {
      if (screen !== 'lumi') setScreen('lumi');
      lumi?.createWish();
      return;
    }
    setEditingTask(createInboxDraft());
    setSheetOpen(true);
  };

  const tabs = [
    { id: 'calendar' as const, label: t('navCalendar'), icon: '📅' },
    { id: 'growth' as const, label: t('navGrowth'), icon: '✨' },
    { id: 'settings' as const, label: t('navSettings'), icon: '⚙️' },
    { id: 'profile' as const, label: t('navProfile'), icon: '👤' },
  ];

  const onTab = (id: (typeof TAB_IDS)[number]) => {
    if (id === 'calendar') setScreen('calendar');
    else if (id === 'growth') {
      setScreen('lumi');
      lumi?.goWheel();
    } else if (id === 'settings') setScreen('settings');
    else if (id === 'profile') setScreen('settings-profile');
  };

  const settingsOn = screen.startsWith('settings') && screen !== 'settings-profile';
  const profileOn = screen === 'settings-profile' || screen === 'settings-password';

  return (
    <nav className="bottom-nav">
      {tabs.slice(0, 2).map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`bottom-nav__item ${(tab.id === 'calendar' && screen === 'calendar') || (tab.id === 'growth' && screen === 'lumi') ? 'bottom-nav__item--active' : ''}`}
          onClick={() => onTab(tab.id)}
        >
          <span className="bottom-nav__icon">{tab.icon}</span>
          <span className="bottom-nav__label">{tab.label}</span>
        </button>
      ))}
      <button
        type="button"
        className="bottom-nav__item bottom-nav__item--add"
        aria-label={screen === 'lumi' || mainTab === 'lumi' ? t('navNewWish') : t('navNewTask')}
        onClick={openNew}
      >
        <span className="bottom-nav__plus" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
      </button>
      {tabs.slice(2).map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`bottom-nav__item ${tab.id === 'settings' && settingsOn ? 'bottom-nav__item--active' : ''} ${tab.id === 'profile' && profileOn ? 'bottom-nav__item--active' : ''}`}
          onClick={() => onTab(tab.id)}
        >
          <span className="bottom-nav__icon">{tab.icon}</span>
          <span className="bottom-nav__label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
