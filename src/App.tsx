import { AppProvider, useApp } from './context/AppContext';
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

function DeleteConfirm() {
  const { pendingDelete, cancelDelete, confirmDelete } = useApp();
  if (!pendingDelete) return null;
  return (
    <ConfirmDialog
      title="Удалить запись?"
      message={pendingDelete.title
        ? `«${pendingDelete.title}» будет удалена. Это нельзя отменить.`
        : 'Эта запись будет удалена. Это нельзя отменить.'}
      confirmLabel="Удалить"
      cancelLabel="Отмена"
      onCancel={cancelDelete}
      onConfirm={() => { void confirmDelete(); }}
    />
  );
}

function AppRouter() {
  const { ready, screen } = useApp();

  if (!ready) {
    return <div className="app-loading">Загрузка TiLi…</div>;
  }

  switch (screen) {
    case 'onboarding':
      return <Onboarding />;
    case 'auth':
      return <AuthScreen />;
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
    case 'settings-about':
      return <SettingsAbout />;
    case 'calendar':
    default:
      return (
        <div className="app-shell">
          <Header />
          <main className="app-shell__main">
            <CalendarCanvas />
          </main>
          <BottomNav />
          <TaskSheet />
        </div>
      );
  }
}

export default function App() {
  return (
    <AppProvider>
      <AppRouter />
      <DeleteConfirm />
    </AppProvider>
  );
}
