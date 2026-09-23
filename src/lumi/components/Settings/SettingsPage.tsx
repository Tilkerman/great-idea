import { useEffect, useState } from 'react';
import Header from '../Header/Header';
import './SettingsPages.css';
import { useI18n } from '../../i18n';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  areNotificationsEnabled,
  setNotificationsEnabled,
  getNotificationTime,
  setNotificationTime,
  showTestNotification,
  hasAskedForPermission,
} from '../../utils/notifications';
import { restartReminderScheduler, stopReminderScheduler } from '../../services/reminderScheduler';
import { useApp } from '../../../context/AppContext';
import { cloudPushConfigured, refreshCloudReminders, subscribeTiliPush } from '../../../utils/webPush';

interface SettingsPageProps {
  onBack: () => void;
  onSettingsClick?: () => void;
  onGoHome?: () => void;
}

export default function SettingsPage({ onBack, onSettingsClick, onGoHome }: SettingsPageProps) {
  const { t } = useI18n();
  const { settings } = useApp();
  const [notifications, setNotifications] = useState(() => areNotificationsEnabled());
  const [notificationTime, setNotificationTimeState] = useState(() => getNotificationTime());
  const [permission, setPermission] = useState<NotificationPermission>(() => getNotificationPermission());
  const [isRequesting, setIsRequesting] = useState(false);
  const [testNotificationError, setTestNotificationError] = useState<string | null>(null);

  // Обновляем статус разрешения при изменении
  useEffect(() => {
    setPermission(getNotificationPermission());
  }, []);

  const handleNotificationToggle = async (enabled: boolean) => {
    if (enabled) {
      // Если включаем, нужно проверить разрешение
      if (permission === 'default' || permission === 'denied') {
        setIsRequesting(true);
        try {
          const newPermission = await requestNotificationPermission();
          setPermission(newPermission);
          
          if (newPermission !== 'granted') {
            // Разрешение не предоставлено, не включаем уведомления
            setNotifications(false);
            setIsRequesting(false);
            return;
          }
        } catch (error) {
          console.error('Ошибка при запросе разрешения:', error);
          setNotifications(false);
          setIsRequesting(false);
          return;
        } finally {
          setIsRequesting(false);
        }
      }
      
      setNotifications(true);
      setNotificationsEnabled(true);
      if (cloudPushConfigured()) {
        await subscribeTiliPush();
        await refreshCloudReminders(settings.locale);
      }
      if ('serviceWorker' in navigator) {
        try {
          await navigator.serviceWorker.ready;
          restartReminderScheduler();
        } catch (error) {
          console.error('Ошибка при запуске планировщика:', error);
        }
      } else {
        restartReminderScheduler();
      }
    } else {
      setNotifications(false);
      setNotificationsEnabled(false);
      stopReminderScheduler();
      if (cloudPushConfigured()) {
        await refreshCloudReminders(settings.locale);
      }
    }
  };

  const handleTimeChange = (time: string) => {
    setNotificationTimeState(time);
    setNotificationTime(time);
    
    // Если уведомления включены, перезапускаем планировщик с новым временем
    if (notifications) {
      restartReminderScheduler();
      if (cloudPushConfigured()) {
        void refreshCloudReminders(settings.locale);
      }
    }
  };

  const handleTestNotification = async () => {
    setTestNotificationError(null);
    try {
      await showTestNotification();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setTestNotificationError(errorMessage);
    }
  };

  const isNotificationAvailable = isNotificationSupported();
  const canEnableNotifications = permission === 'granted' || (permission === 'default' && !hasAskedForPermission());

  return (
    <>
      <Header
        onBack={onBack}
        title={t('settings.page.title')}
      />
      <div className="settings-page">
        <div className="settings-page-content">
          <h1 className="settings-page-title">{t('settings.page.title')}</h1>

          <div className="settings-section">
            <h2 className="settings-section-title">{t('settings.page.notifications')}</h2>
            
            {!isNotificationAvailable && (
              <p className="settings-hint settings-hint-error">
                {t('settings.page.notificationsNotSupported')}
              </p>
            )}

            {isNotificationAvailable && permission === 'denied' && (
              <p className="settings-hint settings-hint-error">
                {t('settings.page.notificationsDenied')}
              </p>
            )}

            {isNotificationAvailable && canEnableNotifications && (
              <>
                <label className="settings-switch-row">
                  <span className="settings-switch-row__title">{t('settings.page.notificationsLabel')}</span>
                  <input
                    type="checkbox"
                    className="settings-switch"
                    checked={notifications}
                    onChange={(e) => handleNotificationToggle(e.target.checked)}
                    disabled={isRequesting}
                  />
                </label>

                {notifications && permission === 'granted' && (
                  <>
                    <div className="settings-time-container">
                      <label className="settings-time-label">
                        {t('settings.page.notificationTime')}
                      </label>
                      <input
                        type="time"
                        className="settings-time-input"
                        value={notificationTime}
                        onChange={(e) => handleTimeChange(e.target.value)}
                      />
                    </div>

                    <button
                      type="button"
                      className="settings-test-button"
                      onClick={handleTestNotification}
                    >
                      {t('settings.page.testNotification')}
                    </button>

                    {testNotificationError && (
                      <p className="settings-hint settings-hint-error">
                        {testNotificationError}
                      </p>
                    )}
                  </>
                )}

                {!notifications && permission === 'granted' && (
                  <p className="settings-hint">
                    {t('settings.page.notificationsHintEnabled')}
                  </p>
                )}

                {!notifications && permission === 'default' && (
                  <p className="settings-hint">
                    {t('settings.page.notificationsHint')}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

