import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import {
  changePassword,
  deleteAccount,
  isValidEmail,
  updateAccountProfile,
  verifyPassword,
} from '../../utils/authLocal';
import './Settings.css';

export function SettingsHub() {
  const { setScreen, openAuth, session } = useApp();

  const items = [
    { id: 'settings-profile' as const, label: 'Профиль', sub: session.isGuest ? (session.name ? `${session.name} · гость` : 'Гостевой режим') : (session.name || session.email) },
    { id: 'settings-calendar' as const, label: 'Календарь', sub: 'Часы, неделя, слоты' },
    { id: 'settings-stats' as const, label: 'Статистика', sub: 'Выполнено и по категориям' },
    { id: 'settings-appearance' as const, label: 'Внешний вид', sub: 'Тема и язык' },
    { id: 'settings-data' as const, label: 'Данные', sub: 'Экспорт и резервная копия' },
    { id: 'settings-install' as const, label: 'Установка', sub: 'PWA на телефон' },
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
        <button type="button" className="btn btn--primary settings-auth-cta" onClick={() => openAuth('choice', 'settings')}>
          Создать аккаунт / Войти
        </button>
      )}
    </div>
  );
}

export function SettingsProfile() {
  const { setScreen, openAuth, session, setSession } = useApp();
  const [name, setName] = useState(session.name ?? '');
  const [email, setEmail] = useState(session.email ?? '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [confirmExit, setConfirmExit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const saveProfile = () => {
    setError('');
    setMessage('');
    if (name.trim().length < 2) {
      setError('Имя — хотя бы 2 символа');
      return;
    }
    if (session.isGuest) {
      setSession({ ...session, isGuest: true, name: name.trim() });
      setMessage('Имя сохранено');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Введите нормальный email');
      return;
    }
    try {
      const updated = updateAccountProfile(session.email ?? '', {
        name: name.trim(),
        email,
      });
      if (!updated) {
        setError('Аккаунт на этом телефоне не найден');
        return;
      }
      setSession({ isGuest: false, name: updated.name, email: updated.email });
      setMessage('Профиль сохранён');
    } catch (e) {
      setError(e instanceof Error && e.message === 'exists'
        ? 'Этот email уже занят на этом телефоне'
        : 'Не получилось сохранить');
    }
  };

  return (
    <div className="settings-page">
      <SettingsTopBar title="Профиль" onBack={() => setScreen('settings')} />
      <div className="settings-form">
        <div className="settings-profile-card">
          <span className="settings-profile-card__badge">
            {session.isGuest ? 'Гость' : 'Аккаунт на этом телефоне'}
          </span>
          <p className="settings-profile-card__hint">
            {session.isGuest
              ? 'Календарь работает без регистрации. Задачи хранятся только здесь. Аккаунт можно создать в любой момент.'
              : 'Пока нет облака: имя, почта и пароль живут на этом устройстве. Синхронизации и пушей ещё нет.'}
          </p>
        </div>

        <label className="settings-field">
          Имя
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </label>

        {!session.isGuest && (
          <label className="settings-field">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
            />
          </label>
        )}

        {error && <p className="auth-form__error" role="alert">{error}</p>}
        {message && <p className="settings-note">{message}</p>}

        <button type="button" className="btn btn--primary settings-full" onClick={saveProfile}>
          Сохранить
        </button>

        {session.isGuest ? (
          <button type="button" className="btn btn--ghost settings-full" onClick={() => openAuth('choice', 'settings-profile')}>
            Создать аккаунт / Войти
          </button>
        ) : (
          <>
            <button type="button" className="btn btn--ghost settings-full" onClick={() => setScreen('settings-password')}>
              Сменить пароль
            </button>
            <button type="button" className="btn btn--ghost settings-full" onClick={() => setConfirmExit(true)}>
              Выйти
            </button>
            <button type="button" className="btn btn--danger settings-full" onClick={() => setConfirmDelete(true)}>
              Удалить аккаунт
            </button>
            <p className="settings-note">
              Выход и удаление аккаунта не трогают задачи. Удаляется только вход на этом телефоне.
            </p>
          </>
        )}
      </div>

      {confirmExit && (
        <ConfirmDialog
          title="Выйти из аккаунта?"
          message="Задачи останутся. Снова войти можно с тем же email на этом телефоне."
          confirmLabel="Выйти"
          cancelLabel="Отмена"
          onCancel={() => setConfirmExit(false)}
          onConfirm={() => {
            setSession({ isGuest: true, name: session.name });
            setConfirmExit(false);
            setScreen('settings');
          }}
        />
      )}
      {confirmDelete && session.email && (
        <ConfirmDialog
          title="Удалить аккаунт?"
          message="Email и пароль сотрутся с этого телефона. Задачи календаря останутся."
          confirmLabel="Удалить"
          cancelLabel="Отмена"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            deleteAccount(session.email!);
            setSession({ isGuest: true });
            setConfirmDelete(false);
            setScreen('settings');
          }}
        />
      )}
    </div>
  );
}

export function SettingsPassword() {
  const { setScreen, session } = useApp();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [next2, setNext2] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setError('');
    if (!session.email) {
      setError('Сначала войдите в аккаунт');
      return;
    }
    if (next.length < 6) {
      setError('Новый пароль — минимум 6 символов');
      return;
    }
    if (next !== next2) {
      setError('Пароли не совпадают');
      return;
    }
    setBusy(true);
    try {
      const okCurrent = await verifyPassword(session.email, current);
      if (!okCurrent) {
        setError('Текущий пароль неверный');
        return;
      }
      const ok = await changePassword(session.email, current, next);
      if (!ok) {
        setError('Не получилось сменить пароль');
        return;
      }
      setScreen('settings-profile');
    } finally {
      setBusy(false);
    }
  };

  const type = show ? 'text' : 'password';

  return (
    <div className="settings-page">
      <SettingsTopBar title="Пароль" onBack={() => setScreen('settings-profile')} />
      <div className="settings-form">
        <p className="settings-note">
          Пароль хранится только на этом устройстве. Смена не затрагивает другие телефоны.
        </p>
        <label className="settings-field">
          Текущий пароль
          <input type={type} value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
        </label>
        <label className="settings-field">
          Новый пароль
          <input type={type} value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
        </label>
        <label className="settings-field">
          Ещё раз
          <input type={type} value={next2} onChange={(e) => setNext2(e.target.value)} autoComplete="new-password" />
        </label>
        <button type="button" className="auth-form__switch" onClick={() => setShow((v) => !v)}>
          {show ? 'Скрыть пароль' : 'Показать пароль'}
        </button>
        {error && <p className="auth-form__error" role="alert">{error}</p>}
        <button type="button" className="btn btn--primary settings-full" disabled={busy} onClick={() => { void save(); }}>
          Сохранить пароль
        </button>
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
          <span className="select-wrap">
            <select
              value={settings.dayStartHour}
              onChange={(e) => updateSettings({ dayStartHour: Number(e.target.value) })}
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
              ))}
            </select>
          </span>
        </label>
        <label className="settings-field">
          Конец дня
          <span className="select-wrap">
            <select
              value={settings.dayEndHour}
              onChange={(e) => updateSettings({ dayEndHour: Number(e.target.value) })}
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
              ))}
            </select>
          </span>
        </label>
        <label className="settings-switch-row">
          <span className="settings-switch-row__title">Скрывать пустые часы</span>
          <input
            type="checkbox"
            className="settings-switch"
            checked={settings.hideEmptyHours}
            onChange={(e) => updateSettings({ hideEmptyHours: e.target.checked })}
          />
        </label>
        <label className="settings-switch-row">
          <span className="settings-switch-row__title">Показывать выполненные</span>
          <input
            type="checkbox"
            className="settings-switch"
            checked={settings.showCompleted}
            onChange={(e) => updateSettings({ showCompleted: e.target.checked })}
          />
        </label>
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
          <span className="select-wrap">
            <select
              value={settings.theme}
              onChange={(e) => updateSettings({ theme: e.target.value as typeof settings.theme })}
            >
              <option value="system">Системная</option>
              <option value="light">Светлая</option>
              <option value="dark">Тёмная</option>
            </select>
          </span>
        </label>
        <label className="settings-field">
          Язык
          <span className="select-wrap">
            <select
              value={settings.locale}
              onChange={(e) => updateSettings({ locale: e.target.value as typeof settings.locale })}
            >
              <option value="ru">Русский</option>
              <option value="en">English</option>
            </select>
          </span>
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
        <p className="settings-note">
          Это и есть резервная копия. Аккаунт в облако не сохраняет — только этот телефон.
        </p>
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
        <button type="button" className="btn btn--ghost settings-full" onClick={() => setScreen('onboarding')}>
          Показать введение
        </button>
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
