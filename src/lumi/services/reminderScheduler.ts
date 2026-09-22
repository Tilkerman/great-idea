// Сервис для планирования ежедневных напоминаний

import { areNotificationsEnabled, getNotificationTime, showDailyReminder } from '../utils/notifications';

let reminderInterval: number | null = null;

/**
 * Парсит время в формате "HH:mm" и возвращает количество миллисекунд до этого времени сегодня
 */
function getMillisecondsUntilTime(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(hours, minutes, 0, 0);

  // Если время уже прошло сегодня, планируем на завтра
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }

  return target.getTime() - now.getTime();
}

/**
 * Запускает планировщик напоминаний
 */
export function startReminderScheduler(): void {
  // Останавливаем предыдущий планировщик, если он был
  stopReminderScheduler();

  if (!areNotificationsEnabled()) {
    console.log('[ReminderScheduler] Уведомления выключены, планировщик не запускается');
    return;
  }

  const time = getNotificationTime();

  // Планируем первое напоминание
  const msUntilTime = getMillisecondsUntilTime(time);
  
  console.log(`[ReminderScheduler] Планировщик запущен. Время: ${time}, до первого напоминания: ${Math.round(msUntilTime / 1000 / 60)} минут`);
  
  setTimeout(() => {
    // Показываем напоминание
    console.log('[ReminderScheduler] Показываем напоминание');
    showDailyReminder().catch(console.error);
    
    // Затем планируем на каждый день (24 часа)
    reminderInterval = window.setInterval(() => {
      console.log('[ReminderScheduler] Показываем ежедневное напоминание');
      showDailyReminder().catch(console.error);
    }, 24 * 60 * 60 * 1000); // 24 часа
  }, msUntilTime);
}

/**
 * Останавливает планировщик напоминаний
 */
export function stopReminderScheduler(): void {
  if (reminderInterval !== null) {
    clearInterval(reminderInterval);
    reminderInterval = null;
  }
}

/**
 * Перезапускает планировщик (например, при изменении времени)
 */
export function restartReminderScheduler(): void {
  stopReminderScheduler();
  startReminderScheduler();
}

/**
 * Проверяет, запущен ли планировщик
 */
export function isSchedulerRunning(): boolean {
  return reminderInterval !== null;
}

