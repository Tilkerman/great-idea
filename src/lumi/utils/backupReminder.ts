// Утилиты для работы с напоминаниями о резервном копировании

const LAST_BACKUP_DATE_KEY = 'tili-lumi-last-backup-date';
const REMINDER_DISMISSED_KEY = 'tili-lumi-backup-reminder-dismissed';
const DAYS_BETWEEN_REMINDERS = 7; // Напоминать каждые 7 дней

/**
 * Сохраняет дату последнего экспорта данных
 */
export function saveLastBackupDate(): void {
  const now = new Date().toISOString();
  localStorage.setItem(LAST_BACKUP_DATE_KEY, now);
  // Сбрасываем флаг отложенного напоминания при новом экспорте
  localStorage.removeItem(REMINDER_DISMISSED_KEY);
}

/**
 * Получает дату последнего экспорта данных
 */
export function getLastBackupDate(): Date | null {
  const dateStr = localStorage.getItem(LAST_BACKUP_DATE_KEY);
  if (!dateStr) return null;
  
  try {
    return new Date(dateStr);
  } catch (error) {
    console.error('Error parsing last backup date:', error);
    return null;
  }
}

/**
 * Проверяет, нужно ли показать напоминание о резервном копировании
 */
export function shouldShowBackupReminder(): boolean {
  // Проверяем, было ли напоминание отложено сегодня
  const dismissedToday = localStorage.getItem(REMINDER_DISMISSED_KEY);
  if (dismissedToday) {
    const dismissedDate = new Date(dismissedToday);
    const today = new Date();
    // Если отложили сегодня, не показываем
    if (dismissedDate.toDateString() === today.toDateString()) {
      return false;
    }
  }

  const lastBackupDate = getLastBackupDate();
  
  // Если никогда не было экспорта, проверяем дату первого использования
  if (!lastBackupDate) {
    const firstUseDate = localStorage.getItem('tili-lumi-first-use-date');
    if (!firstUseDate) {
      // Первый запуск - сохраняем дату, но не показываем напоминание
      localStorage.setItem('tili-lumi-first-use-date', new Date().toISOString());
      return false;
    }
    
    // Проверяем, прошло ли 7 дней с первого использования
    const firstUse = new Date(firstUseDate);
    const now = new Date();
    const daysSinceFirstUse = Math.floor(
      (now.getTime() - firstUse.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    return daysSinceFirstUse >= DAYS_BETWEEN_REMINDERS;
  }

  // Если был экспорт, проверяем, прошло ли 7 дней
  const now = new Date();
  const daysSinceBackup = Math.floor(
    (now.getTime() - lastBackupDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysSinceBackup >= DAYS_BETWEEN_REMINDERS;
}

/**
 * Откладывает напоминание до следующего дня
 */
export function dismissBackupReminder(): void {
  const now = new Date().toISOString();
  localStorage.setItem(REMINDER_DISMISSED_KEY, now);
}

/**
 * Получает количество дней с последнего экспорта
 */
export function getDaysSinceLastBackup(): number | null {
  const lastBackupDate = getLastBackupDate();
  if (!lastBackupDate) return null;

  const now = new Date();
  const days = Math.floor(
    (now.getTime() - lastBackupDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return days;
}

