import { useEffect, useLayoutEffect, useRef } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { LumiHostProvider } from './lumi/LumiHost';
import { Onboarding } from './components/onboarding/Onboarding';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { CalendarCanvas } from './components/calendar/CalendarCanvas';
import { TaskSheet } from './components/tasks/TaskSheet';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { AuthScreen } from './components/auth/AuthScreen';
import {
  SettingsHub,
  SettingsProfile,
  SettingsPassword,
  SettingsCalendar,
  SettingsAppearance,
  SettingsData,
  SettingsTransfer,
  SettingsAbout,
} from './components/settings/Settings';
import { SettingsStatistics } from './components/settings/SettingsStatistics';
import { SettingsInstall } from './components/settings/SettingsInstall';
import { SettingsNotifications } from './components/settings/SettingsNotifications';
import { SettingsSupport } from './components/settings/SettingsSupport';
import { useTaskReminders } from './hooks/useTaskReminders';
import { useOpenTaskFromNotification } from './hooks/useOpenTaskFromNotification';
import { useI18n } from './i18n/useI18n';
import { LumiEmbed } from './lumi/LumiEmbed';
import { persistUtmFromUrl, trackAppOpenOnce } from './utils/productAnalytics';
import { useAppViewportHeight } from './hooks/useAppViewportHeight';
import { useDesktopLayoutClass } from './hooks/useDesktopLayoutClass';
import { useLayoutMode } from './hooks/useLayoutMode';
import { SideNav } from './components/layout/SideNav';

function DeleteConfirm() {
  const { pendingDelete, cancelDelete, confirmDelete } = useApp();
  const { t } = useI18n();
  if (!pendingDelete) return null;
  return (
    <ConfirmDialog
      title={t('deleteTitle')}
      message={pendingDelete.title
        ? t('deleteNamed', { title: pendingDelete.title })
        : t('deleteUnnamed')}
      confirmLabel={t('delete')}
      cancelLabel={t('cancel')}
      onCancel={cancelDelete}
      onConfirm={() => { void confirmDelete(); }}
    />
  );
}

function SettingsScreens({ screen }: { screen: string }) {
  switch (screen) {
    case 'settings':
      return <SettingsHub />;
    case 'settings-profile':
      return <SettingsProfile />;
    case 'settings-password':
      return <SettingsPassword />;
    case 'settings-calendar':
      return <SettingsCalendar />;
    case 'settings-appearance':
      return <SettingsAppearance />;
    case 'settings-data':
      return <SettingsData />;
    case 'settings-transfer':
      return <SettingsTransfer />;
    case 'settings-stats':
      return <SettingsStatistics />;
    case 'settings-install':
      return <SettingsInstall />;
    case 'settings-notifications':
      return <SettingsNotifications />;
    case 'settings-about':
      return <SettingsAbout />;
    case 'settings-support':
      return <SettingsSupport />;
    default:
      return null;
  }
}

function AppRouter() {
  const { ready, screen, settings, sheetOpen } = useApp();
  const { isDesktopLayout } = useLayoutMode();
  const settingsOverlayRef = useRef<HTMLDivElement>(null);
  useTaskReminders();
  useOpenTaskFromNotification();

  useLayoutEffect(() => {
    if (screen.startsWith('settings')) {
      settingsOverlayRef.current?.scrollTo({ top: 0, left: 0 });
    }
  }, [screen]);

  useLayoutEffect(() => {
    const onboarding = ready && screen === 'onboarding';
    document.documentElement.classList.toggle('is-onboarding', onboarding);
    return () => document.documentElement.classList.remove('is-onboarding');
  }, [ready, screen]);

  useEffect(() => {
    if (!ready) return;
    persistUtmFromUrl();
    if (settings.analyticsEnabled) {
      trackAppOpenOnce(true, settings.locale);
    }
  }, [ready, settings.analyticsEnabled, settings.locale]);

  const { t } = useI18n();
  if (!ready) {
    return (
      <div className="app-viewport app-viewport--center">
        <div className="app-loading">{t('loading')}</div>
      </div>
    );
  }

  if (screen === 'onboarding') {
    return (
      <div className="app-viewport app-viewport--onboarding">
        <Onboarding />
      </div>
    );
  }
  if (screen === 'auth') {
    return (
      <div className="app-viewport app-viewport--scroll">
        <AuthScreen />
      </div>
    );
  }

  const inSettings = screen.startsWith('settings');
  const showCalendar = screen === 'calendar';
  const showLumi = screen === 'lumi';

  return (
    <div
      className={[
        'app-viewport',
        isDesktopLayout && sheetOpen ? 'app-viewport--task-open' : '',
      ].filter(Boolean).join(' ')}
    >
      <SideNav />
      <div className="app-viewport__main">
        {showCalendar && (
          <div className={`app-shell${screen === 'calendar' ? '' : ' app-shell--off'}`}>
            <Header />
            <main className="app-shell__main">
              <CalendarCanvas />
            </main>
          </div>
        )}
        <div className={`app-shell app-shell--lumi${showLumi ? '' : ' app-shell--off'}`}>
          <main className="app-shell__main">
            <LumiEmbed />
          </main>
        </div>
        {inSettings && (
          <div ref={settingsOverlayRef} className="settings-overlay">
            <SettingsScreens screen={screen} />
          </div>
        )}
        <BottomNav />
      </div>
      <TaskSheet />
    </div>
  );
}

export default function App() {
  useAppViewportHeight();
  useDesktopLayoutClass();
  return (
    <AppProvider>
      <LumiHostProvider>
        <AppRouter />
        <DeleteConfirm />
      </LumiHostProvider>
    </AppProvider>
  );
}
