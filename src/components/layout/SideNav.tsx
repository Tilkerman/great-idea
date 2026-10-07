import { useApp } from '../../context/AppContext';
import { createInboxDraft } from '../../utils/hourSlot';
import { useI18n } from '../../i18n/useI18n';
import { useLumiHost } from '../../lumi/LumiHost';
import { NavIcon } from './BottomNav';
import './SideNav.css';

const TAB_IDS = ['calendar', 'growth', 'settings', 'profile'] as const;

export function SideNav() {
  const { screen, setScreen, setEditingTask, setSheetOpen } = useApp();
  const { api: lumi } = useLumiHost();
  const { t } = useI18n();

  const isLumiPlus = screen === 'lumi';

  const openNew = () => {
    if (isLumiPlus) {
      if (screen !== 'lumi') setScreen('lumi');
      lumi?.createWish();
      return;
    }
    setEditingTask(createInboxDraft());
    setSheetOpen(true);
  };

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

  const tabs = [
    { id: 'calendar' as const, label: t('navCalendar') },
    { id: 'growth' as const, label: t('navGrowth') },
    { id: 'settings' as const, label: t('navSettings') },
    { id: 'profile' as const, label: t('navProfile') },
  ];

  return (
    <nav className="side-nav" aria-label={t('navCalendar')}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={[
            'side-nav__item',
            `side-nav__item--${tab.id}`,
            (tab.id === 'calendar' && screen === 'calendar') ? 'side-nav__item--active' : '',
            (tab.id === 'growth' && screen === 'lumi') ? 'side-nav__item--active' : '',
            tab.id === 'settings' && settingsOn ? 'side-nav__item--active' : '',
            tab.id === 'profile' && profileOn ? 'side-nav__item--active' : '',
          ].filter(Boolean).join(' ')}
          title={tab.label}
          onClick={() => onTab(tab.id)}
        >
          <span className="side-nav__icon"><NavIcon name={tab.id} /></span>
          <span className="side-nav__label">{tab.label}</span>
        </button>
      ))}
      <button
        type="button"
        className="side-nav__add"
        title={isLumiPlus ? t('navNewWish') : t('navNewTask')}
        aria-label={isLumiPlus ? t('navNewWish') : t('navNewTask')}
        onClick={openNew}
      >
        <span className="side-nav__add-icon" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 5.5v13M5.5 12h13" />
          </svg>
        </span>
      </button>
    </nav>
  );
}
