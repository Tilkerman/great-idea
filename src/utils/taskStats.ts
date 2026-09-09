import { CATEGORY_META } from '../constants/categories';
import type { Task, TaskCategory } from '../types';
import { addDays, getWeekStart, startOfDay } from './date';

export type StatsPeriod = 'day' | 'week' | 'month' | 'year';

export interface CategoryBreakdown {
  total: number;
  completed: number;
  planned: number;
  missed: number;
}

export interface TaskStatsReport {
  periodLabel: string;
  total: number;
  completed: number;
  planned: number;
  missed: number;
  /** 0–100, только по прошедшим делам (выполнено + пропущено) */
  completionRate: number;
  important: { total: number; completed: number };
  byCategory: Record<TaskCategory, CategoryBreakdown>;
  hoursScheduled: number;
  hoursCompleted: number;
}

const EMPTY_CAT: CategoryBreakdown = { total: 0, completed: 0, planned: 0, missed: 0 };

function emptyCategories(): Record<TaskCategory, CategoryBreakdown> {
  return { work: { ...EMPTY_CAT }, personal: { ...EMPTY_CAT }, family: { ...EMPTY_CAT } };
}

function taskHours(task: Task): number {
  const ms = new Date(task.endAt).getTime() - new Date(task.startAt).getTime();
  return Math.max(0, ms / 3600000);
}

function periodRange(
  period: StatsPeriod,
  weekStartsOn: 0 | 1,
  now = new Date(),
): { start: Date; end: Date; label: string } {
  const today = startOfDay(now);
  if (period === 'day') {
    const start = today;
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);
    const label = today.toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return { start, end, label: label.charAt(0).toUpperCase() + label.slice(1) };
  }
  if (period === 'week') {
    const start = getWeekStart(today, weekStartsOn);
    const end = addDays(start, 6);
    end.setHours(23, 59, 59, 999);
    const fmt = (d: Date) => d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    return { start, end, label: `Неделя ${fmt(start)} – ${fmt(end)}` };
  }
  if (period === 'month') {
    return monthRange(today);
  }
  return yearRange(today);
}

function monthRange(today: Date) {
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
  const label = start.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  return { start, end, label: label.charAt(0).toUpperCase() + label.slice(1) };
}

function yearRange(today: Date) {
  const y = today.getFullYear();
  const start = new Date(y, 0, 1);
  const end = new Date(y, 11, 31, 23, 59, 59, 999);
  return { start, end, label: `${y} год` };
}

function inPeriod(task: Task, start: Date, end: Date) {
  const t = new Date(task.startAt);
  return t >= start && t <= end;
}

function isPast(task: Task, now: Date) {
  return new Date(task.endAt).getTime() < now.getTime();
}

export function computeTaskStats(
  tasks: Task[],
  period: StatsPeriod,
  weekStartsOn: 0 | 1,
  now = new Date(),
): TaskStatsReport {
  const { start, end, label } = periodRange(period, weekStartsOn, now);
  const byCategory = emptyCategories();
  let total = 0;
  let completed = 0;
  let planned = 0;
  let missed = 0;
  let importantTotal = 0;
  let importantCompleted = 0;
  let hoursScheduled = 0;
  let hoursCompleted = 0;

  for (const task of tasks) {
    if (!inPeriod(task, start, end)) continue;
    total += 1;
    hoursScheduled += taskHours(task);

    const cat = byCategory[task.category];
    cat.total += 1;

    if (task.important) importantTotal += 1;

    if (task.status === 'completed') {
      completed += 1;
      cat.completed += 1;
      hoursCompleted += taskHours(task);
      if (task.important) importantCompleted += 1;
    } else if (isPast(task, now)) {
      missed += 1;
      cat.missed += 1;
    } else {
      planned += 1;
      cat.planned += 1;
    }
  }

  const pastTotal = completed + missed;
  const completionRate = pastTotal > 0 ? Math.round((completed / pastTotal) * 100) : 0;

  return {
    periodLabel: label,
    total,
    completed,
    planned,
    missed,
    completionRate,
    important: { total: importantTotal, completed: importantCompleted },
    byCategory,
    hoursScheduled,
    hoursCompleted,
  };
}

export const STATS_PERIOD_OPTIONS: { id: StatsPeriod; label: string }[] = [
  { id: 'day', label: 'День' },
  { id: 'week', label: 'Неделя' },
  { id: 'month', label: 'Месяц' },
  { id: 'year', label: 'Год' },
];

export const CATEGORY_ORDER: TaskCategory[] = ['work', 'personal', 'family'];

export function categoryLabel(cat: TaskCategory) {
  return CATEGORY_META[cat].label.split(' / ')[0] ?? CATEGORY_META[cat].label;
}
