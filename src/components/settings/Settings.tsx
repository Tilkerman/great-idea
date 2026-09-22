import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useI18n } from '../../i18n/useI18n';
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
  const { t } = useI18n();

  const items = [
    { id: 'settings-calendar' as const, label: t('settingsCalendar'), sub: t('settingsCalendarSub') },
    { id: 'settings-stats' as const, label: t('settingsStats'), sub: t('settingsStatsSub') },
    { id: 'settings-appearance' as const, label: t('settingsAppearance'), sub: t('settingsAppearanceSub') },
    { id: 'settings-data' as const, label: t('settingsData'), sub: t('settingsDataSub') },
    { id: 'settings-install' as const, label: t('settingsInstall'), sub: t('settingsInstallSub') },
    { id: 'settings-notifications' as const, label: t('settingsNotif'), sub: t('settingsNotifSub') },
    { id: 'settings-about' as const, label: t('settingsAbout'), sub: t('settingsAboutSub') },
  ];

  return (
    <div className="settings-page">
      <SettingsTopBar title={t('settings')} onBack={() => setScreen('calendar')} />
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
          {t('authCta')}
        </button>
      )}
    </div>
  );
}

export function SettingsProfile() {
  const { setScreen, openAuth, session, setSession } = useApp();
  const { t } = useI18n();
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
      setError(t('nameTooShort'));
      return;
    }
    if (session.isGuest) {
      setSession({ ...session, isGuest: true, name: name.trim() });
      setMessage(t('nameSaved'));
      return;
    }
    if (!isValidEmail(email)) {
      setError(t('badEmail'));
      return;
    }
    try {
      const updated = updateAccountProfile(session.email ?? '', {
        name: name.trim(),
        email,
      });
      if (!updated) {
        setError(t('accountNotFound'));
        return;
      }
      setSession({ isGuest: false, name: updated.name, email: updated.email });
      setMessage(t('profileSaved'));
    } catch (e) {
      setError(e instanceof Error && e.message === 'exists'
        ? t('emailTaken')
        : t('saveFailed'));
    }
  };

  return (
    <div className="settings-page">
      <SettingsTopBar title={t('profile')} onBack={() => setScreen('calendar')} />
      <div className="settings-form">
        <div className="settings-profile-card">
          <span className="settings-profile-card__badge">
            {session.isGuest ? t('guest') : t('accountOnPhone')}
          </span>
          <p className="settings-profile-card__hint">
            {session.isGuest
              ? t('guestHint')
              : t('accountHint')}
          </p>
        </div>

        <label className="settings-field">
          {t('name')}
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </label>

        {!session.isGuest && (
          <label className="settings-field">
            {t('email')}
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
          {t('save')}
        </button>

        {session.isGuest ? (
          <button type="button" className="btn btn--ghost settings-full" onClick={() => openAuth('choice', 'settings-profile')}>
            {t('authCta')}
          </button>
        ) : (
          <>
            <button type="button" className="btn btn--ghost settings-full" onClick={() => setScreen('settings-password')}>
              {t('changePassword')}
            </button>
            <button type="button" className="btn btn--ghost settings-full" onClick={() => setConfirmExit(true)}>
              {t('logout')}
            </button>
            <button type="button" className="btn btn--danger settings-full" onClick={() => setConfirmDelete(true)}>
              {t('deleteAccount')}
            </button>
            <p className="settings-note">
              {t('logoutNote')}
            </p>
          </>
        )}
      </div>

      {confirmExit && (
        <ConfirmDialog
          title={t('logoutTitle')}
          message={t('logoutMsg')}
          confirmLabel={t('logout')}
          cancelLabel={t('cancel')}
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
          title={t('deleteAccountTitle')}
          message={t('deleteAccountMsg')}
          confirmLabel={t('delete')}
          cancelLabel={t('cancel')}
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
  const { t } = useI18n();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [next2, setNext2] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setError('');
    if (!session.email) {
      setError(t('loginFirst'));
      return;
    }
    if (next.length < 6) {
      setError(t('passwordMin'));
      return;
    }
    if (next !== next2) {
      setError(t('passwordMismatch'));
      return;
    }
    setBusy(true);
    try {
      const okCurrent = await verifyPassword(session.email, current);
      if (!okCurrent) {
        setError(t('passwordWrong'));
        return;
      }
      const ok = await changePassword(session.email, current, next);
      if (!ok) {
        setError(t('passwordChangeFail'));
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
      <SettingsTopBar title={t('password')} onBack={() => setScreen('settings-profile')} />
      <div className="settings-form">
        <p className="settings-note">
          {t('passwordLocalNote')}
        </p>
        <label className="settings-field">
          {t('currentPassword')}
          <input type={type} value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
        </label>
        <label className="settings-field">
          {t('newPassword')}
          <input type={type} value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
        </label>
        <label className="settings-field">
          {t('newPasswordAgain')}
          <input type={type} value={next2} onChange={(e) => setNext2(e.target.value)} autoComplete="new-password" />
        </label>
        <button type="button" className="auth-form__switch" onClick={() => setShow((v) => !v)}>
          {show ? t('hidePassword') : t('showPassword')}
        </button>
        {error && <p className="auth-form__error" role="alert">{error}</p>}
        <button type="button" className="btn btn--primary settings-full" disabled={busy} onClick={() => { void save(); }}>
          {t('savePassword')}
        </button>
      </div>
    </div>
  );
}

export function SettingsCalendar() {
  const { setScreen, settings, updateSettings } = useApp();
  const { t } = useI18n();

  return (
    <div className="settings-page">
      <SettingsTopBar title={t('settingsCalendar')} onBack={() => setScreen('settings')} />
      <div className="settings-form">
        <label className="settings-field">
          {t('dayStart')}
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
          {t('dayEnd')}
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
          <span className="settings-switch-row__title">{t('hideEmptyHours')}</span>
          <input
            type="checkbox"
            className="settings-switch"
            checked={settings.hideEmptyHours}
            onChange={(e) => updateSettings({ hideEmptyHours: e.target.checked })}
          />
        </label>
        <label className="settings-switch-row">
          <span className="settings-switch-row__title">{t('showCompleted')}</span>
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
  const { t } = useI18n();

  return (
    <div className="settings-page">
      <SettingsTopBar title={t('settingsAppearance')} onBack={() => setScreen('settings')} />
      <div className="settings-form">
        <label className="settings-field">
          {t('theme')}
          <span className="select-wrap">
            <select
              value={settings.theme}
              onChange={(e) => updateSettings({ theme: e.target.value as typeof settings.theme })}
            >
              <option value="system">{t('themeSystem')}</option>
              <option value="light">{t('themeLight')}</option>
              <option value="dark">{t('themeDark')}</option>
            </select>
          </span>
        </label>
        <label className="settings-field">
          {t('language')}
          <span className="select-wrap">
            <select
              value={settings.locale}
              onChange={(e) => updateSettings({ locale: e.target.value as typeof settings.locale })}
            >
              <option value="ru">{t('langRu')}</option>
              <option value="en">{t('langEn')}</option>
              <option value="es">{t('langEs')}</option>
            </select>
          </span>
        </label>
      </div>
    </div>
  );
}

export function SettingsData() {
  const { setScreen } = useApp();
  const { t } = useI18n();

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
    if (!confirm(t('clearConfirm'))) return;
    const { clearAllData } = await import('../../db');
    await clearAllData();
    window.location.reload();
  };

  return (
    <div className="settings-page">
      <SettingsTopBar title={t('settingsData')} onBack={() => setScreen('settings')} />
      <div className="settings-form">
        <button type="button" className="btn btn--ghost settings-full" onClick={exportData}>
          {t('exportJson')}
        </button>
        <p className="settings-note">
          {t('exportNote')}
        </p>
        <button type="button" className="btn btn--danger settings-full" onClick={clearData}>
          {t('clearAll')}
        </button>
      </div>
    </div>
  );
}

export function SettingsAbout() {
  const { setScreen } = useApp();
  const { t } = useI18n();

  return (
    <div className="settings-page">
      <SettingsTopBar title={t('settingsAbout')} onBack={() => setScreen('settings')} />
      <div className="settings-about">
        <p className="settings-about__logo">TiLi Calendar</p>
        <p className="settings-about__ver">{t('mvp')}</p>
        <p className="settings-about__tagline">{t('aboutTagline')}</p>
        <button type="button" className="btn btn--ghost settings-full" onClick={() => setScreen('onboarding')}>
          {t('showIntro')}
        </button>
      </div>
    </div>
  );
}

function SettingsTopBar({ title, onBack }: { title: string; onBack: () => void }) {
  const { t } = useI18n();
  return (
    <header className="settings-topbar">
      <button type="button" onClick={onBack}>{t('back')}</button>
      <span>{title}</span>
      <span />
    </header>
  );
}
