import { useRef, useState, type ChangeEvent } from 'react';
import { useApp } from '../../context/AppContext';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useI18n } from '../../i18n/useI18n';
import { useLumiHost, type LumiSettingsPage } from '../../lumi/LumiHost';
import { isCloudAccountEnabled } from '../../utils/accountApi';
import {
  changeAccountPassword,
  isValidEmail,
  removeAccount,
  signOutAccount,
  updateAccount,
  updateAccountSession,
} from '../../utils/authService';
import { setAnalyticsConsent, trackAppOpenOnce } from '../../utils/productAnalytics';
import {
  buildFullBackup,
  downloadBackupJson,
  importFullBackup,
  normalizeBackup,
} from '../../utils/fullBackup';
import { getAllTasks, replaceAllTasks } from '../../db';
import {
  pullCalendarFromCloud,
  pushCalendarToCloud,
  readCalendarSyncRevision,
  writeCalendarSyncRevision,
} from '../../utils/calendarSync';
import {
  pullLumiFromCloud,
  pushLumiToCloud,
  readLocalLumiSnapshot,
  readLumiSyncRevision,
  replaceLocalLumiSnapshot,
  writeLumiSyncRevision,
} from '../../utils/lumiSync';
import { saveLastBackupDate } from '../../lumi/utils/backupReminder';
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


function SettingsSection({
  title,
  items,
  onPick,
  defaultOpen = false,
}: {
  title: string;
  items: HubItem[];
  onPick: (id: string) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="settings-section">
      <button
        type="button"
        className="settings-section__toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="settings-section__heading">{title}</span>
        <span className={`settings-section__chev${open ? ' is-open' : ''}`} aria-hidden>›</span>
      </button>
      {open && <SettingsList items={items} onPick={onPick} />}
    </section>
  );
}

export function SettingsHub() {
  const { setScreen, mainTab, openAuth, session } = useApp();
  const { requestOpenSettingsPage } = useLumiHost();
  const { t } = useI18n();

  const commonItems: HubItem[] = [
    { id: 'settings-transfer', label: t('settingsTransfer'), sub: t('settingsTransferSub') },
    { id: 'settings-appearance', label: t('settingsAppearance'), sub: t('settingsAppearanceSub') },
    { id: 'settings-install', label: t('settingsInstall'), sub: t('settingsInstallSub') },
    { id: 'settings-data', label: t('settingsData'), sub: t('settingsDataSub') },
    { id: 'settings-support', label: t('supportTitle'), sub: t('supportSub') },
  ];

  const lumiItems: HubItem[] = [
    { id: 'lumi-tutorial', label: t('settingsLumiHow'), sub: t('settingsLumiHowSub') },
    { id: 'lumi-settings', label: t('settingsLumiPrefs'), sub: t('settingsLumiPrefsSub') },
    { id: 'lumi-statistics', label: t('settingsLumiStats'), sub: t('settingsLumiStatsSub') },
    { id: 'lumi-completed', label: t('settingsLumiDone'), sub: t('settingsLumiDoneSub') },
    { id: 'lumi-feedback', label: t('settingsLumiFeedback'), sub: t('settingsLumiFeedbackSub') },
    { id: 'lumi-about', label: t('settingsLumiAboutPage'), sub: t('settingsLumiAboutSub') },
  ];

  const tiliItems: HubItem[] = [
    { id: 'settings-calendar', label: t('settingsCalendar'), sub: t('settingsCalendarSub') },
    { id: 'settings-stats', label: t('settingsStats'), sub: t('settingsStatsSub') },
    { id: 'settings-notifications', label: t('settingsNotif'), sub: t('settingsNotifSub') },
    { id: 'settings-about', label: t('settingsAboutPage'), sub: t('settingsAboutSub') },
  ];

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
      <SettingsSection
        title={t('settingsSectionCommon')}
        items={commonItems}
        onPick={onPick}
        defaultOpen
      />
      <SettingsSection
        title={t('settingsSectionTili')}
        items={tiliItems}
        onPick={onPick}
      />
      <SettingsSection
        title={t('settingsSectionLumi')}
        items={lumiItems}
        onPick={onPick}
      />
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
  const [deletePassword, setDeletePassword] = useState('');

  const saveProfile = async () => {
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
    if (isCloudAccountEnabled()) {
      const updated = await updateAccountSession(session.email ?? '', { name: name.trim() });
      if (!updated) {
        setError(t('saveFailed'));
        return;
      }
      setSession(updated);
      setMessage(t('profileSaved'));
      return;
    }
    if (!isValidEmail(email)) {
      setError(t('badEmail'));
      return;
    }
    try {
      const updated = updateAccount(session.email ?? '', {
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
              readOnly={isCloudAccountEnabled()}
            />
          </label>
        )}

        {error && <p className="auth-form__error" role="alert">{error}</p>}
        {message && <p className="settings-note">{message}</p>}

        <button type="button" className="btn btn--primary settings-full" onClick={() => { void saveProfile(); }}>
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
            void signOutAccount().finally(() => {
              setSession({ isGuest: true, name: session.name });
              setConfirmExit(false);
              setScreen('settings');
            });
          }}
        />
      )}
      {confirmDelete && session.email && isCloudAccountEnabled() && (
        <label className="settings-field">
          {t('password')}
          <input
            type="password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
      )}
      {confirmDelete && session.email && (
        <ConfirmDialog
          title={t('deleteAccountTitle')}
          message={t('deleteAccountMsg')}
          confirmLabel={t('delete')}
          cancelLabel={t('cancel')}
          onCancel={() => {
            setConfirmDelete(false);
            setDeletePassword('');
          }}
          onConfirm={() => {
            void (async () => {
              try {
                if (isCloudAccountEnabled()) {
                  await removeAccount(session.email!, deletePassword);
                  await signOutAccount();
                } else {
                  await removeAccount(session.email!);
                }
                setSession({ isGuest: true });
                setConfirmDelete(false);
                setDeletePassword('');
                setScreen('settings');
              } catch {
                setError(t('passwordWrong'));
                setConfirmDelete(false);
              }
            })();
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
      const ok = await changeAccountPassword(session.email, current, next);
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

export function SettingsTransfer() {
  const { setScreen, session, refreshTasks } = useApp();
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [cloudBusy, setCloudBusy] = useState(false);

  const cloudAccountReady = isCloudAccountEnabled()
    && !session.isGuest
    && session.emailVerified;

  const onExport = async () => {
    setStatus(null);
    setExportBusy(true);
    try {
      const payload = await buildFullBackup();
      downloadBackupJson(payload);
      saveLastBackupDate();
      setStatus({ kind: 'ok', text: t('transferExportDone') });
    } catch {
      setStatus({ kind: 'err', text: t('transferExportFail') });
    } finally {
      setExportBusy(false);
    }
  };

  const onFileChosen = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    setPendingFile(file);
    setImportConfirmOpen(true);
  };

  const runImport = async () => {
    if (!pendingFile) return;
    setImportConfirmOpen(false);
    setStatus(null);
    setImportBusy(true);
    try {
      const text = await pendingFile.text();
      const raw = JSON.parse(text) as unknown;
      const payload = normalizeBackup(raw);
      await importFullBackup(payload);
      setStatus({ kind: 'ok', text: t('transferImportDone') });
      window.setTimeout(() => window.location.reload(), 800);
    } catch {
      setStatus({ kind: 'err', text: t('transferImportFail') });
    } finally {
      setImportBusy(false);
      setPendingFile(null);
    }
  };

  return (
    <div className="settings-page">
      <SettingsTopBar title={t('settingsTransfer')} onBack={() => setScreen('settings')} />
      <div className="settings-form settings-transfer">
        <p className="settings-transfer__lead">{t('transferLead')}</p>

        {cloudAccountReady && (
          <section className="settings-transfer__step">
            <h2 className="settings-transfer__step-title">{t('settingsTransfer')}</h2>
            <p className="settings-note">{t('transferCloudLead')}</p>
            <button
              type="button"
              className="btn btn--primary settings-full settings-transfer__btn"
              disabled={cloudBusy}
              onClick={() => {
                void (async () => {
                  setCloudBusy(true);
                  setStatus(null);
                  try {
                    const tasks = await getAllTasks();
                    const baseRevision = readCalendarSyncRevision();
                    const result = await pushCalendarToCloud(tasks, baseRevision);
                    if ('conflict' in result && result.conflict) {
                      await replaceAllTasks(result.snapshot);
                      writeCalendarSyncRevision(result.revision);
                      await refreshTasks();
                    } else {
                      writeCalendarSyncRevision(result.revision);
                    }
                    setStatus({ kind: 'ok', text: t('transferCloudDone') });
                  } catch {
                    setStatus({ kind: 'err', text: t('transferCloudFail') });
                  } finally {
                    setCloudBusy(false);
                  }
                })();
              }}
            >
              {t('transferCloudUpload')}
            </button>
            <button
              type="button"
              className="btn btn--ghost settings-full settings-transfer__btn"
              disabled={cloudBusy}
              onClick={() => {
                void (async () => {
                  setCloudBusy(true);
                  setStatus(null);
                  try {
                    const remote = await pullCalendarFromCloud();
                    if (!remote) throw new Error('no_remote');
                    await replaceAllTasks(remote.snapshot);
                    writeCalendarSyncRevision(remote.revision);
                    await refreshTasks();
                    setStatus({ kind: 'ok', text: t('transferCloudDone') });
                  } catch {
                    setStatus({ kind: 'err', text: t('transferCloudFail') });
                  } finally {
                    setCloudBusy(false);
                  }
                })();
              }}
            >
              {t('transferCloudDownload')}
            </button>
            <p className="settings-note">{t('transferLumiLead')}</p>
            <button
              type="button"
              className="btn btn--primary settings-full settings-transfer__btn"
              disabled={cloudBusy}
              onClick={() => {
                void (async () => {
                  setCloudBusy(true);
                  setStatus(null);
                  try {
                    const snapshot = await readLocalLumiSnapshot();
                    const baseRevision = readLumiSyncRevision();
                    const result = await pushLumiToCloud(snapshot, baseRevision);
                    if ('conflict' in result && result.conflict) {
                      await replaceLocalLumiSnapshot(result.snapshot);
                      writeLumiSyncRevision(result.revision);
                      window.setTimeout(() => window.location.reload(), 600);
                    } else {
                      writeLumiSyncRevision(result.revision);
                    }
                    setStatus({ kind: 'ok', text: t('transferLumiDone') });
                  } catch {
                    setStatus({ kind: 'err', text: t('transferLumiFail') });
                  } finally {
                    setCloudBusy(false);
                  }
                })();
              }}
            >
              {t('transferLumiUpload')}
            </button>
            <button
              type="button"
              className="btn btn--ghost settings-full settings-transfer__btn"
              disabled={cloudBusy}
              onClick={() => {
                void (async () => {
                  setCloudBusy(true);
                  setStatus(null);
                  try {
                    const remote = await pullLumiFromCloud();
                    if (!remote) throw new Error('no_remote');
                    await replaceLocalLumiSnapshot(remote.snapshot);
                    writeLumiSyncRevision(remote.revision);
                    setStatus({ kind: 'ok', text: t('transferLumiDone') });
                    window.setTimeout(() => window.location.reload(), 600);
                  } catch {
                    setStatus({ kind: 'err', text: t('transferLumiFail') });
                  } finally {
                    setCloudBusy(false);
                  }
                })();
              }}
            >
              {t('transferLumiDownload')}
            </button>
          </section>
        )}

        <section className="settings-transfer__step">
          <h2 className="settings-transfer__step-title">{t('transferStep1Title')}</h2>
          <p className="settings-note">{t('transferStep1Body')}</p>
          <button
            type="button"
            className="btn btn--primary settings-full settings-transfer__btn"
            disabled={exportBusy}
            onClick={() => void onExport()}
          >
            {exportBusy ? t('transferSaving') : t('transferExportBtn')}
          </button>
        </section>

        <section className="settings-transfer__step">
          <h2 className="settings-transfer__step-title">{t('transferStep2Title')}</h2>
          <p className="settings-note">{t('transferStep2Body')}</p>
        </section>

        <section className="settings-transfer__step">
          <h2 className="settings-transfer__step-title">{t('transferStep3Title')}</h2>
          <p className="settings-note">{t('transferStep3Body')}</p>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="settings-transfer__file"
            onChange={onFileChosen}
          />
          <button
            type="button"
            className="btn btn--primary settings-full settings-transfer__btn"
            disabled={importBusy}
            onClick={() => fileRef.current?.click()}
          >
            {importBusy ? t('transferSaving') : t('transferImportBtn')}
          </button>
        </section>

        <p className="settings-note settings-transfer__hint">{t('transferHint')}</p>

        {status && (
          <p
            className={`settings-transfer__status${status.kind === 'err' ? ' settings-transfer__status--err' : ''}`}
            role="status"
          >
            {status.text}
          </p>
        )}
      </div>

      {importConfirmOpen && (
        <ConfirmDialog
          title={t('transferImportConfirmTitle')}
          message={t('transferImportConfirmBody')}
          confirmLabel={t('transferImportConfirmBtn')}
          cancelLabel={t('cancel')}
          onCancel={() => {
            setImportConfirmOpen(false);
            setPendingFile(null);
          }}
          onConfirm={() => { void runImport(); }}
        />
      )}
    </div>
  );
}

export function SettingsData() {
  const { setScreen, settings, updateSettings, loadDemoThreeWeeks } = useApp();
  const { t } = useI18n();

  const onAnalyticsToggle = (enabled: boolean) => {
    setAnalyticsConsent(enabled);
    void updateSettings({ analyticsEnabled: enabled }).then(() => {
      if (enabled) trackAppOpenOnce(true, settings.locale);
    });
  };

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

  const loadDemo = async () => {
    if (!confirm(t('demoThreeWeeksConfirm'))) return;
    await loadDemoThreeWeeks();
    alert(t('demoThreeWeeksDone'));
  };

  return (
    <div className="settings-page">
      <SettingsTopBar title={t('settingsData')} onBack={() => setScreen('settings')} />
      <div className="settings-form">
        <label className="task-sheet__check settings-analytics">
          <input
            type="checkbox"
            checked={settings.voiceAiEnabled}
            onChange={(e) => void updateSettings({ voiceAiEnabled: e.target.checked })}
          />
          {t('voiceSettingsLabel')}
        </label>
        <p className="settings-note">{t('voiceSettingsHint')}</p>
        <label className="task-sheet__check settings-analytics">
          <input
            type="checkbox"
            checked={settings.analyticsEnabled}
            onChange={(e) => onAnalyticsToggle(e.target.checked)}
          />
          {t('analyticsSettingsLabel')}
        </label>
        <p className="settings-note">{t('analyticsSettingsHint')}</p>
        <a
          className="settings-note settings-link"
          href={`${import.meta.env.BASE_URL}privacy.html`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('analyticsPrivacyLink')}
        </a>
        <button type="button" className="btn btn--secondary settings-full" onClick={() => { void loadDemo(); }}>
          {t('demoThreeWeeks')}
        </button>
        <p className="settings-note">{t('demoThreeWeeksHint')}</p>
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

        <h2 className="settings-about__h">{t('aboutWhatTitle')}</h2>
        <h3 className="settings-about__h2">{t('aboutFeatureTimeTitle')}</h3>
        <p>{t('aboutFeatureTime')}</p>
        <h3 className="settings-about__h2">{t('aboutFeatureFreeTitle')}</h3>
        <p>{t('aboutFeatureFree')}</p>
        <h3 className="settings-about__h2">{t('aboutFeatureLevelsTitle')}</h3>
        <p>{t('aboutFeatureLevels')}</p>
        <h3 className="settings-about__h2">{t('aboutFeatureFastTitle')}</h3>
        <p>{t('aboutFeatureFast')}</p>
        <h3 className="settings-about__h2">{t('aboutFeatureReminderTitle')}</h3>
        <p>{t('aboutFeatureReminder')}</p>
        <h3 className="settings-about__h2">{t('aboutFeatureCategoriesTitle')}</h3>
        <p>{t('aboutFeatureCategories')}</p>

        <h2 className="settings-about__h">{t('aboutGuideTitle')}</h2>
        <h3 className="settings-about__h2">{t('aboutGuide1Title')}</h3>
        <p>{t('aboutGuide1')}</p>
        <h3 className="settings-about__h2">{t('aboutGuide2Title')}</h3>
        <p>{t('aboutGuide2')}</p>
        <h3 className="settings-about__h2">{t('aboutGuide3Title')}</h3>
        <p>{t('aboutGuide3')}</p>
        <h3 className="settings-about__h2">{t('aboutGuide4Title')}</h3>
        <p>{t('aboutGuide4')}</p>
        <h3 className="settings-about__h2">{t('aboutGuide5Title')}</h3>
        <p>{t('aboutGuide5')}</p>
        <h3 className="settings-about__h2">{t('aboutGuide6Title')}</h3>
        <p>{t('aboutGuide6')}</p>

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
