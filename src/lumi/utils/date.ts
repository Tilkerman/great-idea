// Утилиты для работы с датами

export type SupportedLocale = 'ru' | 'en' | 'es';

function getDateLocale(locale?: SupportedLocale): string {
  if (locale === 'en') return 'en-US';
  if (locale === 'es') return 'es';
  return 'ru-RU';
}

export function formatDate(date: string, locale: SupportedLocale = 'ru'): string {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Проверяем, сегодня ли это
  if (d.toDateString() === today.toDateString()) {
    return locale === 'ru' ? 'Сегодня' : locale === 'es' ? 'Hoy' : 'Today';
  }

  // Проверяем, вчера ли это
  if (d.toDateString() === yesterday.toDateString()) {
    return locale === 'ru' ? 'Вчера' : locale === 'es' ? 'Ayer' : 'Yesterday';
  }

  // Форматируем дату
  return d.toLocaleDateString(getDateLocale(locale), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function getTodayDateString(): string {
  return toLocalDateString(new Date()); // YYYY-MM-DD (локальная дата)
}

/**
 * Возвращает YYYY-MM-DD в локальном времени (без UTC-сдвигов).
 */
export function toLocalDateString(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function formatDateTime(date: string, locale: SupportedLocale = 'ru'): string {
  const d = new Date(date);
  return d.toLocaleString(getDateLocale(locale), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}






