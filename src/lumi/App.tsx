import { useState, useEffect, useCallback } from 'react';
import DesireForm from './components/DesireForm/DesireForm';
import DesireDetail from './components/DesireDetail/DesireDetail';
import type { Desire, LifeArea } from './types';
import { desireService } from './services/db';
import { useI18n } from './i18n';
import LifeWheel from './components/LifeWheel/LifeWheel';
import AreaPickerModal from './components/LifeWheel/AreaPickerModal';
import DesiresList from './components/DesiresList/DesiresList';
import SettingsModal from './components/Settings/SettingsModal';
import AboutPage from './components/Settings/AboutPage';
import TutorialPage from './components/Settings/TutorialPage';
import InstallPage from './components/Settings/InstallPage';
import SettingsPage from './components/Settings/SettingsPage';
import FeedbackPage from './components/Settings/FeedbackPage';
import StatisticsPage from './components/Settings/StatisticsPage';
import WelcomeScreen from './components/WelcomeScreen/WelcomeScreen';
import IntroScreen from './components/IntroScreen/IntroScreen';
import { startReminderScheduler } from './services/reminderScheduler';
import { useLumiHost } from './LumiHost';
import { useApp } from '../context/AppContext';

type View =
  | 'welcome'
  | 'intro'
  | 'wheel'
  | 'list'
  | 'form'
  | 'detail'
  | 'about'
  | 'tutorial'
  | 'install'
  | 'settings'
  | 'feedback'
  | 'statistics'
  | 'completed';

const ONBOARDING_DONE_KEY = 'tili-lumi-onboarding-done-v1';

function App() {
  const { t } = useI18n();
  const { setScreen } = useApp();
  const {
    setApi,
    settingsOpenNonce,
    pendingSettingsPage,
    consumePendingSettingsPage,
    consumeReturnToSettingsHub,
  } = useLumiHost();
  const [currentView, setCurrentView] = useState<View>('welcome'); // Начальное состояние - welcome
  const forcedView = null as View | null;
  const [selectedDesireId, setSelectedDesireId] = useState<string | null>(null);
  const [editingDesire, setEditingDesire] = useState<Desire | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [presetArea, setPresetArea] = useState<LifeArea | null>(null);
  const [listAreaFilter, setListAreaFilter] = useState<LifeArea | null>(null);
  const [askAreaAfterSave, setAskAreaAfterSave] = useState(false);
  const [pendingAreaForDesireId, setPendingAreaForDesireId] = useState<string | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [previousView, setPreviousView] = useState<View | null>(null);
  const [previousViewBeforeEdit, setPreviousViewBeforeEdit] = useState<View | null>(null);

  // Проверяем наличие желаний при загрузке
  useEffect(() => {
    const checkDesires = async () => {
      try {
        // Dev/QA helper: allow forcing a view via URL without wiping data
        // Example: http://localhost:5173/?view=welcome or ?view=intro
        if (forcedView) {
          setCurrentView(forcedView);
          return;
        }
        const desires = await desireService.getAllDesires();
        if (desires.length === 0) {
          // Если нет желаний, показываем WelcomeScreen (или пропускаем, если онбординг уже пройден)
          const onboardingDone = localStorage.getItem(ONBOARDING_DONE_KEY) === '1';
          setCurrentView(onboardingDone ? 'wheel' : 'welcome');
        } else {
          setCurrentView('list');
        }
      } catch (error) {
        console.error('Ошибка при проверке желаний:', error);
        setCurrentView('welcome');
      } finally {
        setIsLoading(false);
      }
    };

    checkDesires();
  }, [forcedView]);

  // Инициализируем планировщик напоминаний при загрузке
  useEffect(() => {
    // Ждем регистрации service worker перед запуском планировщика
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        startReminderScheduler();
      }).catch(console.error);
    }
  }, []);

  const handleCreateDesire = () => {
    setEditingDesire(undefined);
    setCurrentView('form');
  };

  const createWishFromNav = useCallback(() => {
    setPresetArea(null);
    setAskAreaAfterSave(true);
    setEditingDesire(undefined);
    setCurrentView('form');
  }, []);

  const showAllWishes = useCallback(() => {
    setListAreaFilter(null);
    setCurrentView('list');
  }, []);

  const goWheel = useCallback(() => {
    setListAreaFilter(null);
    setCurrentView('wheel');
  }, []);

  const toggleListAndWheel = useCallback(() => {
    setCurrentView((v) => {
      if (v === 'list') return 'wheel';
      if (v === 'wheel') return 'list';
      return v;
    });
  }, []);

  useEffect(() => {
    setApi({
      createWish: createWishFromNav,
      showAllWishes,
      goWheel,
      toggleListAndWheel,
    });
    return () => setApi(null);
  }, [setApi, createWishFromNav, showAllWishes, goWheel, toggleListAndWheel]);

  useEffect(() => {
    if (settingsOpenNonce > 0) setIsSettingsModalOpen(true);
  }, [settingsOpenNonce]);

  useEffect(() => {
    if (!pendingSettingsPage) return;
    setIsSettingsModalOpen(false);
    setCurrentView(pendingSettingsPage);
  }, [pendingSettingsPage]);

  const handleDesireSaved = (desireId?: string) => {
    setEditingDesire(undefined);
    if (desireId) {
      if (askAreaAfterSave) {
        setPendingAreaForDesireId(desireId);
        setCurrentView('wheel');
      } else {
        // Если редактировали желание, восстанавливаем previousView, который был до редактирования
        // Иначе устанавливаем 'form' как previousView
        if (previousViewBeforeEdit !== null) {
          setPreviousView(previousViewBeforeEdit);
          setPreviousViewBeforeEdit(null);
        } else {
          setPreviousView('form');
        }
        setSelectedDesireId(desireId);
        setCurrentView('detail');
      }
    } else {
      setCurrentView('wheel');
      setSelectedDesireId(null);
    }
    setAskAreaAfterSave(false);
    setPresetArea(null);
  };

  const handleBackToWheel = () => {
    setSelectedDesireId(null);
    // Возвращаемся на предыдущую страницу, если она была сохранена, иначе на wheel
    setCurrentView(previousView || 'wheel');
    setPreviousView(null);
  };

  const handleGoHome = () => {
    consumePendingSettingsPage();
    setSelectedDesireId(null);
    setEditingDesire(undefined);
    setListAreaFilter(null);
    setPreviousView(null);
    setPreviousViewBeforeEdit(null);
    setPendingAreaForDesireId(null);
    setAskAreaAfterSave(false);
    setPresetArea(null);
    setIsSettingsModalOpen(false);
    setCurrentView('wheel');
  };

  const handleSettingsClick = () => {
    console.log('[App] Settings clicked, opening modal');
    setIsSettingsModalOpen(true);
  };

  const handleSettingsMenuItemClick = (menuItem: string) => {
    switch (menuItem) {
      case 'about':
        setCurrentView('about');
        break;
      case 'tutorial':
        setCurrentView('tutorial');
        break;
      case 'install':
        setCurrentView('install');
        break;
      case 'settings':
        setCurrentView('settings');
        break;
      case 'feedback':
        setCurrentView('feedback');
        break;
      case 'statistics':
        setCurrentView('statistics');
        break;
      case 'completed':
        setCurrentView('completed');
        break;
    }
  };


  const handleBackFromSettings = () => {
    consumePendingSettingsPage();
    setCurrentView('wheel');
    if (consumeReturnToSettingsHub()) setScreen('settings');
  };

  const handleDataCleared = () => {
    // После очистки данных показываем WelcomeScreen
    setCurrentView('welcome');
    window.location.reload();
  };

  const handleWelcomeStart = () => {
    // При клике на START открываем 2-й экран (онбординг)
    setCurrentView('intro');
  };

  const handleIntroGo = () => {
    // По клику GO — переходим на главную страницу (колесо)
    localStorage.setItem(ONBOARDING_DONE_KEY, '1');
    setCurrentView('wheel');
  };

  // Показываем Welcome Screen во время загрузки, если текущий view - welcome
  // Это гарантирует, что при первом запуске пользователь сразу увидит Welcome Screen
  if (isLoading && currentView === 'welcome') {
    return (
      <>
        <WelcomeScreen onStart={handleWelcomeStart} onSettingsClick={handleSettingsClick} onGoHome={handleGoHome} />
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          onMenuItemClick={handleSettingsMenuItemClick}
        />
      </>
    );
  }

  if (isLoading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        padding: '2rem'
      }}>
        <div style={{ fontSize: '1rem', textAlign: 'center' }}>{t('common.loading')}</div>
      </div>
    );
  }

  if (currentView === 'welcome') {
    return (
      <>
        <WelcomeScreen onStart={handleWelcomeStart} onSettingsClick={handleSettingsClick} onGoHome={handleGoHome} />
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          onMenuItemClick={handleSettingsMenuItemClick}
        />
      </>
    );
  }

  if (currentView === 'intro') {
    return (
      <>
        <IntroScreen onGo={handleIntroGo} onSettingsClick={handleSettingsClick} />
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          onMenuItemClick={handleSettingsMenuItemClick}
        />
      </>
    );
  }

  if (currentView === 'wheel') {
    return (
      <>
        <LifeWheel
          onCreateWishInArea={(area) => {
            setPresetArea(area);
            setAskAreaAfterSave(false);
            handleCreateDesire();
          }}
          onShowAllDesires={(area) => {
            setListAreaFilter(area ?? null);
            setCurrentView('list');
          }}
          onGoHome={handleGoHome}
        />
        <AreaPickerModal
          open={!!pendingAreaForDesireId}
          onClose={() => setPendingAreaForDesireId(null)}
          onPick={async (area) => {
            if (!pendingAreaForDesireId) return;
            await desireService.updateDesire(pendingAreaForDesireId, { area });
            const id = pendingAreaForDesireId;
            setPendingAreaForDesireId(null);
            setPreviousView('wheel');
            setSelectedDesireId(id);
            setCurrentView('detail');
          }}
        />
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          onMenuItemClick={handleSettingsMenuItemClick}
        />
      </>
    );
  }

  if (currentView === 'list') {
    return (
      <>
        <DesiresList
          filterArea={listAreaFilter}
          onBack={() => {
            setListAreaFilter(null);
            setCurrentView('wheel');
          }}
          useAreaBorderColors
          onDesireClick={(desire) => {
            setPreviousView('list');
            setSelectedDesireId(desire.id);
            setCurrentView('detail');
          }}
          onAddDesire={() => {
            setPresetArea(null);
            setAskAreaAfterSave(true);
            handleCreateDesire();
          }}
          onSettingsClick={handleSettingsClick}
          onGoHome={handleGoHome}
        />
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          onMenuItemClick={handleSettingsMenuItemClick}
        />
      </>
    );
  }

  if (currentView === 'form') {
    return (
      <>
        <DesireForm 
          onSave={handleDesireSaved} 
          initialDesire={editingDesire}
          presetArea={presetArea}
          onBack={() => {
            // Если редактируем желание, возвращаемся на detail, иначе на wheel
            if (editingDesire && previousView === 'detail') {
              setCurrentView('detail');
              setPreviousView(null);
            } else {
              setCurrentView(previousView || 'wheel');
              setPreviousView(null);
            }
          }}
          onSettingsClick={handleSettingsClick}
          onGoHome={handleGoHome}
        />
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          onMenuItemClick={handleSettingsMenuItemClick}
        />
      </>
    );
  }

  if (currentView === 'detail' && selectedDesireId) {
    return (
      <>
        <DesireDetail
          desireId={selectedDesireId}
          onBack={handleBackToWheel}
          onGoHome={handleGoHome}
          onSettingsClick={handleSettingsClick}
          onEdit={async () => {
            const desire = await desireService.getDesireById(selectedDesireId);
            if (desire) {
              // Сохраняем текущий previousView перед переходом на форму редактирования
              // чтобы после сохранения вернуться на исходную страницу (list, wheel, etc)
              setPreviousViewBeforeEdit(previousView);
              setEditingDesire(desire);
              setCurrentView('form');
            }
          }}
        />
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          onMenuItemClick={handleSettingsMenuItemClick}
        />
      </>
    );
  }

  if (currentView === 'about') {
    return (
      <>
        <AboutPage onBack={handleBackFromSettings} onSettingsClick={handleSettingsClick} onGoHome={handleGoHome} />
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          onMenuItemClick={handleSettingsMenuItemClick}
        />
      </>
    );
  }

  if (currentView === 'tutorial') {
    return (
      <>
        <TutorialPage
          onBack={handleBackFromSettings}
          onCreateDesire={() => {
            setPresetArea(null);
            setAskAreaAfterSave(true);
            handleCreateDesire();
          }}
          onSettingsClick={handleSettingsClick}
          onGoHome={handleGoHome}
        />
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          onMenuItemClick={handleSettingsMenuItemClick}
        />
      </>
    );
  }

  if (currentView === 'install') {
    return (
      <>
        <InstallPage 
          onBack={handleBackFromSettings} 
          onSettingsClick={handleSettingsClick}
          onDataCleared={handleDataCleared}
          onGoHome={handleGoHome}
        />
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          onMenuItemClick={handleSettingsMenuItemClick}
        />
      </>
    );
  }

  if (currentView === 'settings') {
    return (
      <>
        <SettingsPage onBack={handleBackFromSettings} onSettingsClick={handleSettingsClick} onGoHome={handleGoHome} />
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          onMenuItemClick={handleSettingsMenuItemClick}
        />
      </>
    );
  }

  if (currentView === 'feedback') {
    return (
      <>
        <FeedbackPage onBack={handleBackFromSettings} onSettingsClick={handleSettingsClick} onGoHome={handleGoHome} />
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          onMenuItemClick={handleSettingsMenuItemClick}
        />
      </>
    );
  }

  if (currentView === 'statistics') {
    return (
      <>
        <StatisticsPage
          onBack={handleBackFromSettings}
          onSettingsClick={handleSettingsClick}
          onGoHome={handleGoHome}
          onDesireClick={(desireId) => {
            setPreviousView('statistics');
            setSelectedDesireId(desireId);
            setCurrentView('detail');
          }}
        />
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          onMenuItemClick={handleSettingsMenuItemClick}
        />
      </>
    );
  }

  if (currentView === 'completed') {
    return (
      <>
        <DesiresList
          showCompleted={true}
          onBack={() => setCurrentView('wheel')}
          useAreaBorderColors
          onDesireClick={(desire) => {
            setPreviousView('completed');
            setSelectedDesireId(desire.id);
            setCurrentView('detail');
          }}
          onAddDesire={() => {
            setPresetArea(null);
            setAskAreaAfterSave(true);
            handleCreateDesire();
          }}
          onSettingsClick={handleSettingsClick}
          onGoHome={handleGoHome}
        />
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          onMenuItemClick={handleSettingsMenuItemClick}
        />
      </>
    );
  }


  // Fallback - если что-то пошло не так
  return (
    <>
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        padding: '2rem'
      }}>
        <div style={{ fontSize: '1rem', textAlign: 'center' }}>
          {t('app.unknownState')}
        </div>
      </div>
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onMenuItemClick={handleSettingsMenuItemClick}
      />
    </>
  );
}

export default App;

