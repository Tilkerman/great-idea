// Утилиты для работы с датами

export type SupportedLocale = 'ru' | 'en' | 'es';

export function getDateLocale(locale?: SupportedLocale): string {
  if (locale === 'en') return 'en-US';
  if (locale === 'es') return 'es';
  return 'ru-RU';
}

const MONTHS_NOMINATIVE: Record<SupportedLocale, string[]> = {
  ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  es: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
};

const MONTHS_LONG: Record<SupportedLocale, string[]> = {
  ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
};

const WEEKDAYS_SHORT: Record<SupportedLocale, string[]> = {
  ru: ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  es: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
};

export function formatMonthYear(date: Date, locale: SupportedLocale): string {
  return `${MONTHS_NOMINATIVE[locale][date.getMonth()]} ${date.getFullYear()}`;
}

export function weekDaysShort(locale: SupportedLocale): string[] {
  return WEEKDAYS_SHORT[locale];
}

export function formatLongDate(date: Date, locale: SupportedLocale): string {
  const month = MONTHS_LONG[locale][date.getMonth()];
  if (locale === 'es') return `${date.getDate()} de ${month} de ${date.getFullYear()}`;
  return `${date.getDate()} ${month} ${date.getFullYear()}`;
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






