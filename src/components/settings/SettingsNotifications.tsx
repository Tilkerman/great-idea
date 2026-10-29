import { useEffect, useMemo, useState } from 'react';
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
import { pingPushHello, sendTestPush } from '../../utils/webPush';
import { trackPushEnabledOnce } from '../../utils/productAnalytics';
import './Settings.css';

export function SettingsNotifications() {
  const { setScreen, settings, updateSettings } = useApp();
  const { t, locale } = useI18n();
  const [perm, setPerm] = useState(() => notificationPermission());
  const [feedback, setFeedback] = useState<string | null>(null);
  const blocked = useMemo(() => notificationsBlockedReason(locale), [locale]);
  const ios = useMemo(() => isAppleMobile(), []);
  const installed = useMemo(() => isStandaloneApp(), []);

  useEffect(() => {
    const refresh = () => setPerm(notificationPermission());
    refresh();
    void pingPushHello();
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, []);

  const permLabel =
    perm === 'granted' ? t('notifStatusGranted')
      : perm === 'denied' ? t('notifStatusDenied')
        : perm === 'unsupported' ? t('notifStatusOff')
          : t('notifStatusAsk');

  const onEnable = () => {
    setFeedback(t('notifCloudSaving'));
    void (async () => {
      const result = await enablePushFromGesture();
      setPerm(notificationPermission());
      if (
        result === 'granted'
        || result === 'granted-no-cloud'
        || result === 'granted-no-push'
        || result === 'granted-no-network'
      ) {
        updateSettings({ notificationsEnabled: true });
        trackPushEnabledOnce(settings.analyticsEnabled);
        setFeedback(
          result === 'granted' ? t('notifGranted')
            : result === 'granted-no-push' ? t('notifNoPush')
              : result === 'granted-no-network' ? t('notifNoNetwork')
                : t('notifCloudFail'),
        );
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
    })();
  };

  const onTest = () => {
    if (notificationPermission() !== 'granted') {
      setFeedback(t('notifNeedAllow'));
      return;
    }
    setFeedback(t('notifTestSending'));
    void (async () => {
      try {
        if (await sendTestPush()) {
          setFeedback(t('notifTestSent'));
          return;
        }
        await showTiliNotification('TiLi', reminderNoticeBody(locale), 'tili-test');
        setFeedback(t('notifTestLocalOnly'));
      } catch {
        setFeedback(t('notifTestFail'));
      }
    })();
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
          {ios
            ? t('notifNote', { url: TILI_PUBLIC_URL })
            : t('notifNoteDesktop', { url: TILI_PUBLIC_URL })}
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
          {settings.notificationsEnabled && perm === 'granted' ? t('notifEnabledSuffix') : ''}
        </p>
        {perm === 'default' && ios && (
          <p className="settings-note settings-note--warn" role="status">
            {t('notifDiagPermDefault')}
          </p>
        )}
        {perm === 'denied' && !ios && (
          <p className="settings-note settings-note--warn" role="status">
            {t('notifDeniedDesktop')}
          </p>
        )}

        <button
          type="button"
          className="btn btn--primary settings-full"
          onClick={onEnable}
        >
          {t('notifAllow')}
        </button>
        <button
          type="button"
          className="btn btn--ghost settings-full"
          disabled={perm !== 'granted'}
          onClick={onTest}
        >
          {t('notifTest')}
        </button>

        {feedback && <p className="settings-note" role="status">{feedback}</p>}
      </div>
    </div>
  );
}
