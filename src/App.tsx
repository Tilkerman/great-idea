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
  SettingsAbout,
} from './components/settings/Settings';
import { SettingsStatistics } from './components/settings/SettingsStatistics';
import { SettingsInstall } from './components/settings/SettingsInstall';
import { SettingsNotifications } from './components/settings/SettingsNotifications';
import { useTaskReminders } from './hooks/useTaskReminders';
import { useOpenTaskFromNotification } from './hooks/useOpenTaskFromNotification';
import { useI18n } from './i18n/useI18n';
import { LumiEmbed } from './lumi/LumiEmbed';

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
    case 'settings-stats':
      return <SettingsStatistics />;
    case 'settings-install':
      return <SettingsInstall />;
    case 'settings-notifications':
      return <SettingsNotifications />;
    case 'settings-about':
      return <SettingsAbout />;
    default:
      return null;
  }
}

function AppRouter() {
  const { ready, screen, mainTab } = useApp();
  useTaskReminders();
  useOpenTaskFromNotification();

  const { t } = useI18n();
  if (!ready) {
    return <div className="app-loading">{t('loading')}</div>;
  }

  if (screen === 'onboarding') return <Onboarding />;
  if (screen === 'auth') return <AuthScreen />;

  const inSettings = screen.startsWith('settings');
  const showCalendar = screen === 'calendar' || (inSettings && mainTab === 'calendar');
  const showLumi = screen === 'lumi' || (inSettings && mainTab === 'lumi');

  return (
    <>
      {showCalendar && (
        <div className={`app-shell${screen === 'calendar' ? '' : ' app-shell--off'}`}>
          <Header />
          <main className="app-shell__main">
            <CalendarCanvas />
          </main>
        </div>
      )}
      {showLumi && (
        <div className={`app-shell app-shell--lumi${screen === 'lumi' ? '' : ' app-shell--off'}`}>
          <main className="app-shell__main">
            <LumiEmbed />
          </main>
        </div>
      )}
      {inSettings && (
        <div className="settings-overlay">
          <SettingsScreens screen={screen} />
        </div>
      )}
      <BottomNav />
      <TaskSheet />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <LumiHostProvider>
        <AppRouter />
        <DeleteConfirm />
      </LumiHostProvider>
    </AppProvider>
  );
}
