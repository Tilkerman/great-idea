import { tLocale } from '../i18n/catalog';
import type { Locale } from '../types';
import { isAppleMobile, isStandaloneApp } from './pwaInstall';

export function reminderNoticeBody(locale: Locale) {
  return tLocale(locale, 'reminderBody');
}

export function notificationsSupported() {
  return typeof window !== 'undefined'
    && window.isSecureContext
    && 'Notification' in window;
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (!notificationsSupported()) return 'unsupported';
  return Notification.permission;
}

/** iOS показывает системный запрос только из PWA на Домой и по HTTPS. */
export function notificationsBlockedReason(locale: Locale = 'ru'): string | null {
  if (!notificationsSupported()) {
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      return tLocale(locale, 'httpsNeeded');
    }
    return tLocale(locale, 'browserNoNotif');
  }
  if (isAppleMobile() && !isStandaloneApp()) {
    return tLocale(locale, 'iosHomeOnly');
  }
  return null;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied';
  return Notification.requestPermission();
}

export async function showTiliNotification(title: string, body: string, tag = 'tili') {
  const icon = `${import.meta.env.BASE_URL}pwa-192.png`;
  const taskId = tag.startsWith('task-') ? tag.slice(5) : '';
  const options: NotificationOptions = {
    body,
    icon,
    tag,
    silent: false,
    data: { taskId },
  };
  const reg = await navigator.serviceWorker?.ready.catch(() => undefined);
  if (reg?.showNotification) {
    await reg.showNotification(title, options);
    return;
  }
  const n = new Notification(title, options);
  n.onclick = () => {
    window.focus();
    n.close();
    if (taskId) {
      window.dispatchEvent(new CustomEvent('tili-open-task', { detail: taskId }));
    }
  };
}
