import type { UserSettings } from '../types';
import { notificationPermission } from './notifications';

const SEEN_KEY = 'tili-first-reminder-hint-seen';

export function taskRemindersFullyOn(settings: UserSettings): boolean {
  if (!settings.notificationsEnabled) return false;
  return notificationPermission() === 'granted';
}

export function hasSeenFirstReminderHint(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function markFirstReminderHintSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* ignore */
  }
}

/** Первый выбор напоминания, пока уведомления ещё не включены в настройках TiLi. */
export function shouldShowFirstReminderHint(
  settings: UserSettings,
  reminderOffsetMinutes: number | null,
): boolean {
  if (reminderOffsetMinutes == null) return false;
  if (hasSeenFirstReminderHint()) return false;
  return !taskRemindersFullyOn(settings);
}
