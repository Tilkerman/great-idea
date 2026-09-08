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
  order: number;
  createdAt: string;
  updatedAt: string;
}

export type AppScreen =
  | 'onboarding'
  | 'auth'
  | 'calendar'
  | 'settings'
  | 'settings-profile'
  | 'settings-calendar'
  | 'settings-notifications'
  | 'settings-appearance'
  | 'settings-data'
  | 'settings-about'
  | 'search';

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
}

export interface UserSession {
  isGuest: boolean;
  name?: string;
  email?: string;
}
