import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useI18n } from '../../i18n/useI18n';
import { useLumiHost, type LumiSettingsPage } from '../../lumi/LumiHost';
import {
  changePassword,
  deleteAccount,
  isValidEmail,
  updateAccountProfile,
  verifyPassword,
} from '../../utils/authLocal';
import './Settings.css';

type HubItem = { id: string; label: string; sub: string };

function SettingsList({ items, onPick }: { items: HubItem[]; onPick: (id: string) => void }) {
  return (
    <ul className="settings-list">
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            className="settings-list__item"
            onClick={() => onPick(item.id)}
          >
            <span className="settings-list__label">{item.label}</span>
            <span className="settings-list__sub">{item.sub}</span>
            <span className="settings-list__chev">›</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function SettingsHub() {
  const { setScreen, mainTab, openAuth, session } = useApp();
  const { requestOpenSettingsPage } = useLumiHost();
  const { t } = useI18n();

  const tiliItems: HubItem[] = [
    { id: 'settings-calendar', label: t('settingsCalendar'), sub: t('settingsCalendarSub') },
    { id: 'settings-stats', label: t('settingsStats'), sub: t('settingsStatsSub') },
    { id: 'settings-notifications', label: t('settingsNotif'), sub: t('settingsNotifSub') },
    { id: 'settings-about', label: t('settingsAbout'), sub: t('settingsAboutSub') },
  ];

  const lumiItems: HubItem[] = [
    { id: 'lumi-tutorial', label: t('settingsLumiHow'), sub: t('settingsLumiHowSub') },
    { id: 'lumi-settings', label: t('settingsLumiPrefs'), sub: t('settingsLumiPrefsSub') },
    { id: 'lumi-statistics', label: t('settingsLumiStats'), sub: t('settingsLumiStatsSub') },
    { id: 'lumi-completed', label: t('settingsLumiDone'), sub: t('settingsLumiDoneSub') },
    { id: 'lumi-feedback', label: t('settingsLumiFeedback'), sub: t('settingsLumiFeedbackSub') },
    { id: 'lumi-about', label: t('settingsLumiAbout'), sub: t('settingsLumiAboutSub') },
  ];

  const commonItems: HubItem[] = [
    { id: 'settings-appearance', label: t('settingsAppearance'), sub: t('settingsAppearanceSub') },
    { id: 'settings-install', label: t('settingsInstall'), sub: t('settingsInstallSub') },
    { id: 'settings-support', label: t('supportTitle'), sub: t('supportSub') },
  ];

  const contextItems = mainTab === 'lumi' ? lumiItems : tiliItems;
  const contextTitle = mainTab === 'lumi' ? t('settingsSectionLumi') : t('settingsSectionTili');

  const onPick = (id: string) => {
    if (id.startsWith('lumi-')) {
      const page = id.slice('lumi-'.length) as LumiSettingsPage;
      requestOpenSettingsPage(page);
      setScreen('lumi');
      return;
    }
    setScreen(id as Parameters<typeof setScreen>[0]);
  };

  return (
    <div className="settings-page">
      <SettingsTopBar title={t('settings')} onBack={() => setScreen(mainTab)} />
      <h2 className="settings-list-heading">{contextTitle}</h2>
      <SettingsList items={contextItems} onPick={onPick} />
      <h2 className="settings-list-heading">{t('settingsSectionCommon')}</h2>
      <SettingsList items={commonItems} onPick={onPick} />
      {session.isGuest && (
        <button type="button" className="btn btn--primary settings-auth-cta" onClick={() => openAuth('choice', 'settings')}>
          {t('authCta')}
        </button>
      )}
    </div>
  );
}

export function SettingsProfile() {
  const { setScreen, mainTab, openAuth, session, setSession } = useApp();
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
      <SettingsTopBar title={t('profile')} onBack={() => setScreen(mainTab)} />
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

  const clearData = async () => {
    if (!confirm(t('clearConfirm'))) return;
    const { clearAllData } = await import('../../db');
    await clearAllData();
    window.location.reload();
  };

  const clearWishes = async () => {
    if (!confirm(t('clearWishesConfirm'))) return;
    const { db } = await import('../../lumi/services/db');
    await db.desires.clear();
    await db.contacts.clear();
    await db.lifeAreas.clear();
    await db.feedbacks.clear();
    await db.actionItems.clear();
    window.location.reload();
  };

  return (
    <div className="settings-page">
      <SettingsTopBar title={t('settingsData')} onBack={() => setScreen('settings')} />
      <div className="settings-form">
        <button type="button" className="btn btn--danger settings-full" onClick={clearData}>
          {t('clearAll')}
        </button>
        <button type="button" className="btn btn--danger settings-full" onClick={clearWishes}>
          {t('clearWishes')}
        </button>
        <p className="settings-note">
          {t('clearWishesNote')}
        </p>
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
      <article className="settings-about">
        <div className="settings-about__intro">
          <p className="settings-about__logo">{t('aboutHeadline')}</p>
          <p className="settings-about__tagline">{t('aboutLead')}</p>
        </div>
        <p>{t('aboutLead2')}</p>

        <h2 className="settings-about__h">{t('aboutHowTitle')}</h2>
        <h3 className="settings-about__h2">{t('aboutHow1Title')}</h3>
        <p>{t('aboutHow1a')}</p>
        <p>{t('aboutHow1Not')}</p>
        <p className="settings-about__quote">{t('aboutHow1Bad')}</p>
        <p>{t('aboutHow1But')}</p>
        <p className="settings-about__quote">{t('aboutHow1Good')}</p>
        <p>{t('aboutHow1b')}</p>

        <h3 className="settings-about__h2">{t('aboutHow2Title')}</h3>
        <p>{t('aboutHow2a')}</p>
        <p>{t('aboutHow2b')}</p>

        <h3 className="settings-about__h2">{t('aboutHow3Title')}</h3>
        <p>{t('aboutHow3a')}</p>
        <ul className="settings-about__list">
          <li>{t('aboutHow3Work')}</li>
          <li>{t('aboutHow3Personal')}</li>
          <li>{t('aboutHow3Family')}</li>
        </ul>
        <p>{t('aboutHow3b')}</p>

        <h3 className="settings-about__h2">{t('aboutHow4Title')}</h3>
        <p>{t('aboutHow4a')}</p>
        <ul className="settings-about__list">
          <li>{t('aboutHow4Name')}</li>
          <li>{t('aboutHow4Desc')}</li>
          <li>{t('aboutHow4Cat')}</li>
          <li>{t('aboutHow4Imp')}</li>
          <li>{t('aboutHow4Rem')}</li>
        </ul>
        <p>{t('aboutHow4b')}</p>

        <h2 className="settings-about__h">{t('aboutRemindTitle')}</h2>
        <p>{t('aboutRemindLead')}</p>
        <ul className="settings-about__list">
          <li>{t('aboutRemind0')}</li>
          <li>{t('aboutRemind5')}</li>
          <li>{t('aboutRemind15')}</li>
          <li>{t('aboutRemind30')}</li>
          <li>{t('aboutRemind60')}</li>
          <li>{t('aboutRemindDay')}</li>
        </ul>
        <p>{t('aboutRemindYou')}</p>

        <h2 className="settings-about__h">{t('aboutUseTitle')}</h2>
        <p>{t('aboutUseLead')}</p>
        <p className="settings-about__levels">{t('aboutUseLevels')}</p>
        <p>{t('aboutUsePinch')}</p>
        <p>{t('aboutUseIn')}</p>
        <p>{t('aboutUseOut')}</p>

        <h2 className="settings-about__h">{t('aboutMainTitle')}</h2>
        <p>{t('aboutMain')}</p>

        <button type="button" className="btn btn--ghost settings-full" onClick={() => setScreen('onboarding')}>
          {t('showIntro')}
        </button>

        <button type="button" className="btn btn--ghost settings-full" onClick={() => setScreen('settings-support')}>
          {t('supportTitle')}
        </button>
      </article>
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
