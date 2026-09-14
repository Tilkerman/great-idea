import { isAppleMobile, isStandaloneApp } from './pwaInstall';

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
export function notificationsBlockedReason(): string | null {
  if (!notificationsSupported()) {
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      return 'Нужен HTTPS. Открой приложение с иконки на Домой (сайт GitHub Pages), не локальный адрес по Wi‑Fi.';
    }
    return 'Этот браузер не умеет уведомления.';
  }
  if (isAppleMobile() && !isStandaloneApp()) {
    return 'На iPhone уведомления работают только из иконки на Домой, не из вкладки Safari.';
  }
  return null;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied';
  return Notification.requestPermission();
}

export async function showTiliNotification(title: string, body: string, tag = 'tili') {
  const icon = `${import.meta.env.BASE_URL}pwa-192.png`;
  const options: NotificationOptions = {
    body,
    icon,
    tag,
    silent: false,
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
  };
}
