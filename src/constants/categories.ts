import type { TaskCategory } from '../types';

export const CATEGORY_META: Record<
  TaskCategory,
  { label: string; bg: string; text: string; dot: string }
> = {
  work: {
    label: 'Работа',
    bg: '#F5B8B8',
    text: '#5c2a2a',
    dot: '#E45D6D',
  },
  personal: {
    label: 'Личное / отдых',
    bg: '#B8D4F0',
    text: '#1e3a5f',
    dot: '#4A90D9',
  },
  family: {
    label: 'Семья',
    bg: '#B8E6B8',
    text: '#1e4d1e',
    dot: '#4CAF50',
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
};

export const ZOOM_LABELS: Record<string, string> = {
  year: 'Год',
  month: 'Месяц',
  week: 'Неделя',
  day: 'День',
};
