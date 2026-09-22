// Утилиты для работы с уведомлениями

const NOTIFICATION_PERMISSION_KEY = 'lumi-notification-permission-asked';
const NOTIFICATION_ENABLED_KEY = 'lumi-notifications-enabled';
const NOTIFICATION_TIME_KEY = 'lumi-notification-time';

export type NotificationPermission = 'default' | 'granted' | 'denied';

/**
 * Проверяет, поддерживает ли браузер уведомления
 */
export function isNotificationSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Получает текущий статус разрешения на уведомления
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) {
    return 'denied';
  }
  const permission = Notification.permission;
  if (permission === 'granted' || permission === 'denied' || permission === 'default') {
    return permission as NotificationPermission;
  }
  return 'default';
}

/**
 * Запрашивает разрешение на уведомления
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    throw new Error('Уведомления не поддерживаются в этом браузере');
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  localStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'true');
  return permission as NotificationPermission;
}

/**
 * Проверяет, были ли уже запрошены разрешения
 */
export function hasAskedForPermission(): boolean {
  return localStorage.getItem(NOTIFICATION_PERMISSION_KEY) === 'true';
}

/**
 * Сохраняет настройку включения/выключения уведомлений
 */
export function setNotificationsEnabled(enabled: boolean): void {
  localStorage.setItem(NOTIFICATION_ENABLED_KEY, enabled ? 'true' : 'false');
}

/**
 * Проверяет, включены ли уведомления
 */
export function areNotificationsEnabled(): boolean {
  return localStorage.getItem(NOTIFICATION_ENABLED_KEY) === 'true';
}

/**
 * Сохраняет время напоминания (формат: "HH:mm", например "20:00")
 */
export function setNotificationTime(time: string): void {
  localStorage.setItem(NOTIFICATION_TIME_KEY, time);
}

/**
 * Получает время напоминания (по умолчанию "20:00")
 */
export function getNotificationTime(): string {
  return localStorage.getItem(NOTIFICATION_TIME_KEY) || '20:00';
}

/**
 * Получает путь к иконке с учетом base path
 */
function getIconPath(): string {
  // В production base path = '/calendar-of-desires/', в dev = '/'
  const base = import.meta.env.BASE_URL || '/';
  return `${base}apple-touch-icon.png`.replace(/\/+/g, '/');
}

/**
 * Показывает тестовое уведомление
 */
export async function showTestNotification(): Promise<void> {
  if (!isNotificationSupported()) {
    throw new Error('Уведомления не поддерживаются');
  }

  if (Notification.permission !== 'granted') {
    throw new Error('Разрешение на уведомления не предоставлено');
  }

  const registration = await navigator.serviceWorker.ready;
  const iconPath = getIconPath();
  
  await registration.showNotification('LUMI', {
    body: 'Это тестовое уведомление. Напоминания работают!',
    icon: iconPath,
    badge: iconPath,
    tag: 'test-notification',
    requireInteraction: false,
  });
}

/**
 * Показывает напоминание о ежедневном ритуале
 */
export async function showDailyReminder(): Promise<void> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return;
  }

  if (!areNotificationsEnabled()) {
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  const iconPath = getIconPath();

  // TS lib.dom тип NotificationOptions не везде содержит `vibrate`,
  // но на части платформ (особенно Android) оно поддерживается.
  const options: NotificationOptions & { vibrate?: number[] } = {
    body: 'Время для ежедневного ритуала! Вернитесь к своим желаниям.',
    icon: iconPath,
    badge: iconPath,
    tag: 'daily-reminder',
    requireInteraction: false,
    vibrate: [200, 100, 200],
  };

  await registration.showNotification('LUMI', options);
}

