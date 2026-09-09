import type { TaskCategory } from '../types';

export const CATEGORY_META: Record<
  TaskCategory,
  { label: string; bg: string; text: string; dot: string }
> = {
  work: {
    label: 'Работа',
    bg: 'var(--cat-work)',
    text: 'var(--cat-work-text)',
    dot: 'var(--cat-work)',
  },
  personal: {
    label: 'Личное / отдых',
    bg: 'var(--cat-personal)',
    text: 'var(--cat-personal-text)',
    dot: 'var(--cat-personal)',
  },
  family: {
    label: 'Семья',
    bg: 'var(--cat-family)',
    text: 'var(--cat-family-text)',
    dot: 'var(--cat-family)',
  },
};

export const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

export const MONTH_NAMES_SHORT = [
  'ЯНВ', 'ФЕВ', 'МАР', 'АПР', 'МАЙ', 'ИЮН',
  'ИЮЛ', 'АВГ', 'СЕН', 'ОКТ', 'НОЯ', 'ДЕК',
];

export const WEEKDAY_NAMES = [
  'ПОНЕДЕЛЬНИК', 'ВТОРНИК', 'СРЕДА', 'ЧЕТВЕРГ', 'ПЯТНИЦА', 'СУББОТА', 'ВОСКРЕСЕНЬЕ',
];

export const WEEKDAY_SHORT = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];

export const REMINDER_OFFSET_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'Не напоминать' },
  { value: 0, label: 'Вовремя' },
  { value: 5, label: 'За 5 минут' },
  { value: 15, label: 'За 15 минут' },
  { value: 30, label: 'За 30 минут' },
  { value: 60, label: 'За 1 час' },
  { value: 1440, label: 'За 1 день' },
];

export const DEFAULT_SETTINGS = {
  dayStartHour: 7,
  dayEndHour: 21,
  weekStartsOn: 1 as const,
  defaultDurationMin: 15,
  hideEmptyHours: false,
  showCompleted: true,
  theme: 'system' as const,
  locale: 'ru' as const,
  importantReminderHours: 2,
  reminderBeforeMin: 15,
  notificationsEnabled: false,
};

export const ZOOM_LABELS: Record<string, string> = {
  year: 'Год',
  month: 'Месяц',
  week: 'Неделя',
  day: 'День',
};
