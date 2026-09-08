import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import './Settings.css';

export function SettingsHub() {
  const { setScreen, session } = useApp();

  const items = [
    { id: 'settings-profile' as const, label: 'Профиль', sub: session.isGuest ? 'Гостевой режим' : session.name },
    { id: 'settings-calendar' as const, label: 'Календарь', sub: 'Часы, неделя, слоты' },
    { id: 'settings-notifications' as const, label: 'Уведомления', sub: 'Push и напоминания' },
    { id: 'settings-appearance' as const, label: 'Внешний вид', sub: 'Тема и язык' },
    { id: 'settings-data' as const, label: 'Данные', sub: 'Экспорт и резервная копия' },
    { id: 'settings-about' as const, label: 'О приложении', sub: 'TiLi Calendar v0.1' },
  ];

  return (
    <div className="settings-page">
      <SettingsTopBar title="Настройки" onBack={() => setScreen('calendar')} />
      <ul className="settings-list">
        {items.map((item) => (
          <li key={item.id}>
            <button type="button" className="settings-list__item" onClick={() => setScreen(item.id)}>
              <span className="settings-list__label">{item.label}</span>
              <span className="settings-list__sub">{item.sub}</span>
              <span className="settings-list__chev">›</span>
            </button>
          </li>
        ))}
      </ul>
      {session.isGuest && (
        <button type="button" className="btn btn--primary settings-auth-cta" onClick={() => setScreen('auth')}>
          Создать аккаунт / Войти
        </button>
      )}
    </div>
  );
}

export function SettingsProfile() {
  const { setScreen, session, setSession } = useApp();
  const [name, setName] = useState(session.name ?? '');

  return (
    <div className="settings-page">
      <SettingsTopBar title="Профиль" onBack={() => setScreen('settings')} />
      <div className="settings-form">
        <label className="settings-field">
          Имя
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        {!session.isGuest && (
          <label className="settings-field">
            Email
            <input value={session.email ?? ''} readOnly />
          </label>
        )}
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => {
            setSession({ ...session, name });
            setScreen('settings');
          }}
        >
          Сохранить
        </button>
        {!session.isGuest && (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              setSession({ isGuest: true });
              setScreen('settings');
            }}
          >
            Выйти
          </button>
        )}
      </div>
    </div>
  );
}

export function SettingsCalendar() {
  const { setScreen, settings, updateSettings } = useApp();

  return (
    <div className="settings-page">
      <SettingsTopBar title="Календарь" onBack={() => setScreen('settings')} />
      <div className="settings-form">
        <label className="settings-field">
          Начало дня
          <select
            value={settings.dayStartHour}
            onChange={(e) => updateSettings({ dayStartHour: Number(e.target.value) })}
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
            ))}
          </select>
        </label>
        <label className="settings-field">
          Конец дня
          <select
            value={settings.dayEndHour}
            onChange={(e) => updateSettings({ dayEndHour: Number(e.target.value) })}
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
            ))}
          </select>
        </label>
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={settings.hideEmptyHours}
            onChange={(e) => updateSettings({ hideEmptyHours: e.target.checked })}
          />
          Скрывать пустые часы
        </label>
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={settings.showCompleted}
            onChange={(e) => updateSettings({ showCompleted: e.target.checked })}
          />
          Показывать выполненные
        </label>
      </div>
    </div>
  );
}

export function SettingsNotifications() {
  const { setScreen, settings, updateSettings } = useApp();

  return (
    <div className="settings-page">
      <SettingsTopBar title="Уведомления" onBack={() => setScreen('settings')} />
      <div className="settings-form">
        <label className="settings-field">
          Напоминание за (мин)
          <select
            value={settings.reminderBeforeMin}
            onChange={(e) => updateSettings({ reminderBeforeMin: Number(e.target.value) })}
          >
            {[5, 10, 15, 30].map((m) => (
              <option key={m} value={m}>{m} мин</option>
            ))}
          </select>
        </label>
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={settings.importantReminderHours === 2}
            onChange={(e) => updateSettings({ importantReminderHours: e.target.checked ? 2 : 0 })}
          />
          Важные задачи — каждые 2 часа
        </label>
        <p className="settings-note">Push-уведомления будут в следующей версии.</p>
      </div>
    </div>
  );
}

export function SettingsAppearance() {
  const { setScreen, settings, updateSettings } = useApp();

  return (
    <div className="settings-page">
      <SettingsTopBar title="Внешний вид" onBack={() => setScreen('settings')} />
      <div className="settings-form">
        <label className="settings-field">
          Тема
          <select
            value={settings.theme}
            onChange={(e) => updateSettings({ theme: e.target.value as typeof settings.theme })}
          >
            <option value="system">Системная</option>
            <option value="light">Светлая</option>
            <option value="dark">Тёмная</option>
          </select>
        </label>
        <label className="settings-field">
          Язык
          <select
            value={settings.locale}
            onChange={(e) => updateSettings({ locale: e.target.value as typeof settings.locale })}
          >
            <option value="ru">Русский</option>
            <option value="en">English</option>
          </select>
        </label>
      </div>
    </div>
  );
}

export function SettingsData() {
  const { setScreen } = useApp();

  const exportData = async () => {
    const { exportData: exp } = await import('../../db');
    const json = await exp();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tili-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearData = async () => {
    if (!confirm('Удалить все задачи? Это нельзя отменить.')) return;
    const { clearAllData } = await import('../../db');
    await clearAllData();
    window.location.reload();
  };

  return (
    <div className="settings-page">
      <SettingsTopBar title="Данные" onBack={() => setScreen('settings')} />
      <div className="settings-form">
        <button type="button" className="btn btn--ghost settings-full" onClick={exportData}>
          Экспорт JSON
        </button>
        <button type="button" className="btn btn--danger settings-full" onClick={clearData}>
          Очистить все данные
        </button>
      </div>
    </div>
  );
}

export function SettingsAbout() {
  const { setScreen } = useApp();

  return (
    <div className="settings-page">
      <SettingsTopBar title="О приложении" onBack={() => setScreen('settings')} />
      <div className="settings-about">
        <p className="settings-about__logo">TiLi Calendar</p>
        <p className="settings-about__ver">v0.1.0 — MVP</p>
        <p className="settings-about__tagline">Управляй своей жизнью с TiLi</p>
      </div>
    </div>
  );
}

function SettingsTopBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="settings-topbar">
      <button type="button" onClick={onBack}>‹ Назад</button>
      <span>{title}</span>
      <span />
    </header>
  );
}
