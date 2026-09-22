import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/useI18n';
import {
  notificationPermission,
  notificationsBlockedReason,
  reminderNoticeBody,
  showTiliNotification,
} from '../../utils/notifications';
import { isAppleMobile, isStandaloneApp, TILI_PUBLIC_URL } from '../../utils/pwaInstall';
import { enablePushFromGesture } from '../../utils/enablePush';
import './Settings.css';

export function SettingsNotifications() {
  const { setScreen, settings, updateSettings } = useApp();
  const { t, locale } = useI18n();
  const [perm, setPerm] = useState(() => notificationPermission());
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const blocked = useMemo(() => notificationsBlockedReason(locale), [locale]);
  const ios = useMemo(() => isAppleMobile(), []);
  const installed = useMemo(() => isStandaloneApp(), []);

  const permLabel =
    perm === 'granted' ? t('notifStatusGranted')
      : perm === 'denied' ? t('notifStatusDenied')
        : perm === 'unsupported' ? t('notifStatusOff')
          : t('notifStatusAsk');

  const onEnable = async () => {
    setFeedback(null);
    setBusy(true);
    try {
      const result = await enablePushFromGesture();
      setPerm(notificationPermission());
      if (result === 'granted') {
        updateSettings({ notificationsEnabled: true });
        setFeedback(t('notifGranted'));
      } else if (result === 'denied') {
        updateSettings({ notificationsEnabled: false });
        setFeedback(t('notifDenied'));
      } else if (result === 'blocked') {
        setFeedback(blocked ?? t('notifBlocked'));
      } else if (result === 'unsupported') {
        setFeedback(t('browserNoNotif'));
      } else {
        setFeedback(t('notifDismissed'));
      }
    } finally {
      setBusy(false);
    }
  };

  const onTest = async () => {
    setFeedback(null);
    setBusy(true);
    try {
      if (notificationPermission() !== 'granted') {
        setFeedback(t('notifNeedAllow'));
        return;
      }
      await showTiliNotification('TiLi', reminderNoticeBody(locale), 'tili-test');
      setFeedback(t('notifTestSent'));
    } catch {
      setFeedback(t('notifTestFail'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="settings-page">
      <header className="settings-topbar">
        <button type="button" onClick={() => setScreen('settings')}>{t('back')}</button>
        <span>{t('settingsNotif')}</span>
        <span />
      </header>
      <div className="settings-form">
        <p className="settings-note">
          {t('notifNote', { url: TILI_PUBLIC_URL })}
        </p>

        {ios && !installed && (
          <p className="settings-note" role="status">
            {t('notifNotStandalone')}
          </p>
        )}

        {blocked && perm !== 'granted' && (
          <p className="settings-note" role="status">{blocked}</p>
        )}

        <p className="settings-note">
          {t('notifStatusPrefix')} {permLabel}
          {settings.notificationsEnabled ? t('notifEnabledSuffix') : ''}
        </p>

        <button
          type="button"
          className="btn btn--primary settings-full"
          disabled={busy || Boolean(blocked)}
          onClick={() => { void onEnable(); }}
        >
          {t('notifAllow')}
        </button>
        <button
          type="button"
          className="btn btn--ghost settings-full"
          disabled={busy || perm !== 'granted'}
          onClick={() => { void onTest(); }}
        >
          {t('notifTest')}
        </button>
        {feedback && <p className="settings-note" role="status">{feedback}</p>}
      </div>
    </div>
  );
}
