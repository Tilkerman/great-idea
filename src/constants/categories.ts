import type { TaskCategory } from '../types';

export const CATEGORY_LABEL_KEY: Record<TaskCategory, 'catWork' | 'catPersonal' | 'catFamily'> = {
  work: 'catWork',
  personal: 'catPersonal',
  family: 'catFamily',
};

export const CATEGORY_META: Record<
  TaskCategory,
  { bg: string; text: string; dot: string }
> = {
  work: {
    bg: 'var(--cat-work)',
    text: 'var(--cat-work-text)',
    dot: 'var(--cat-work)',
  },
  personal: {
    bg: 'var(--cat-personal)',
    text: 'var(--cat-personal-text)',
    dot: 'var(--cat-personal)',
  },
  family: {
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

export const REMINDER_OFFSET_OPTIONS: {
  value: number | null;
  labelKey: 'reminderNone' | 'reminderOnTime' | 'reminderMin5' | 'reminderMin15' | 'reminderMin30' | 'reminderHour1' | 'reminderDay1';
}[] = [
  { value: null, labelKey: 'reminderNone' },
  { value: 0, labelKey: 'reminderOnTime' },
  { value: 5, labelKey: 'reminderMin5' },
  { value: 15, labelKey: 'reminderMin15' },
  { value: 30, labelKey: 'reminderMin30' },
  { value: 60, labelKey: 'reminderHour1' },
  { value: 1440, labelKey: 'reminderDay1' },
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
