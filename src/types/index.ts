export type ZoomLevel = 'year' | 'month' | 'week' | 'day';

export type TaskCategory = 'work' | 'personal' | 'family';

export type TaskStatus = 'active' | 'inactive' | 'completed';

export interface Task {
  id: string;
  title: string;
  description?: string;
  category: TaskCategory;
  startAt: string;
  endAt: string;
  status: TaskStatus;
  important: boolean;
  /** Minutes before start. null = don't remind. Not delivered yet. */
  reminderOffsetMinutes: number | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

/** Содержимое задачи для копирования между слотами (без даты/времени). */
export interface TaskClipboard {
  title: string;
  description?: string;
  category: TaskCategory;
  important: boolean;
  reminderOffsetMinutes: number | null;
}

export type GridClipKind = 'week' | 'day' | 'hour';

/** Шаблон слота для копирования недели / дня / часа (отдельный буфер от карточки). */
export interface GridClipItem {
  dayOffset: number;
  hour: number;
  title: string;
  description?: string;
  category: TaskCategory;
  important: boolean;
  reminderOffsetMinutes: number | null;
  order: number;
}

export interface GridClipboard {
  kind: GridClipKind;
  items: GridClipItem[];
}

export type AppScreen =
  | 'onboarding'
  | 'auth'
  | 'calendar'
  | 'settings'
  | 'settings-profile'
  | 'settings-password'
  | 'settings-calendar'
  | 'settings-appearance'
  | 'settings-data'
  | 'settings-stats'
  | 'settings-install'
  | 'settings-about';

export type AuthStart = 'choice' | 'register' | 'login';

export interface UserSettings {
  dayStartHour: number;
  dayEndHour: number;
  weekStartsOn: 0 | 1;
  defaultDurationMin: number;
  hideEmptyHours: boolean;
  showCompleted: boolean;
  theme: 'system' | 'light' | 'dark';
  locale: 'ru' | 'en';
  importantReminderHours: number;
  reminderBeforeMin: number;
  /** Preference only — push is not delivered yet */
  notificationsEnabled: boolean;
}

export interface UserSession {
  isGuest: boolean;
  name?: string;
  email?: string;
}
