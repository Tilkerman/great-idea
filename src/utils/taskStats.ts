import { CATEGORY_META, WEEKDAY_NAMES } from '../constants/categories';
import type { Task, TaskCategory } from '../types';
import { addDays, addMonths, getWeekStart, startOfDay, toLocalDateString } from './date';

export type StatsPeriod = 'day' | 'week' | 'month' | 'year';

export interface CategoryHoursBreakdown {
  hoursScheduled: number;
  hoursCompleted: number;
  hoursPlanned: number;
  hoursMissed: number;
  taskCount: number;
}

export interface StaleTaskItem {
  id: string;
  title: string;
  daysOpen: number;
  hours: number;
  startAt: string;
}

export interface TaskStatsReport {
  periodLabel: string;
  hasData: boolean;
  hours: {
    scheduled: number;
    completed: number;
    completionPct: number;
  };
  past: {
    hoursClosed: number;
    hoursOverdue: number;
    closedPct: number;
    tasksClosed: number;
    tasksOverdue: number;
  };
  byCategory: Record<TaskCategory, CategoryHoursBreakdown>;
  load: {
    avgHoursPerDay: number;
    daysInPeriod: number;
    busiestWeekday: string | null;
    busiestWeekdayHours: number;
  };
  planFact: {
    plannedHours: number;
    actualHours: number;
    diffHours: number;
    diffPct: number | null;
  };
  important: {
    hoursScheduled: number;
    hoursCompleted: number;
    completionPct: number;
    taskCount: number;
  };
  dynamics: {
    hasPrevious: boolean;
    previousLabel: string;
    completedHoursDeltaPct: number | null;
  };
  tails: {
    over3Days: { count: number; hours: number };
    over7Days: { count: number; hours: number };
    oldest: StaleTaskItem[];
  };
  tasks: {
    total: number;
    completed: number;
    planned: number;
    missed: number;
  };
}

interface PeriodMetrics {
  hoursScheduled: number;
  hoursCompleted: number;
  hoursPlanned: number;
  hoursMissed: number;
  hoursPastClosed: number;
  hoursPastOverdue: number;
  tasksTotal: number;
  tasksCompleted: number;
  tasksPlanned: number;
  tasksMissed: number;
  tasksPastClosed: number;
  tasksPastOverdue: number;
  byCategory: Record<TaskCategory, CategoryHoursBreakdown>;
  hoursByDate: Map<string, number>;
  hoursByWeekday: number[];
  importantScheduled: number;
  importantCompleted: number;
  importantCount: number;
}

const EMPTY_CAT: CategoryHoursBreakdown = {
  hoursScheduled: 0,
  hoursCompleted: 0,
  hoursPlanned: 0,
  hoursMissed: 0,
  taskCount: 0,
};

function emptyCategories(): Record<TaskCategory, CategoryHoursBreakdown> {
  return { work: { ...EMPTY_CAT }, personal: { ...EMPTY_CAT }, family: { ...EMPTY_CAT } };
}

function emptyMetrics(): PeriodMetrics {
  return {
    hoursScheduled: 0,
    hoursCompleted: 0,
    hoursPlanned: 0,
    hoursMissed: 0,
    hoursPastClosed: 0,
    hoursPastOverdue: 0,
    tasksTotal: 0,
    tasksCompleted: 0,
    tasksPlanned: 0,
    tasksMissed: 0,
    tasksPastClosed: 0,
    tasksPastOverdue: 0,
    byCategory: emptyCategories(),
    hoursByDate: new Map(),
    hoursByWeekday: [0, 0, 0, 0, 0, 0, 0],
    importantScheduled: 0,
    importantCompleted: 0,
    importantCount: 0,
  };
}

export function taskHours(task: Task): number {
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

function previousPeriodAnchor(period: StatsPeriod, weekStartsOn: 0 | 1, now: Date): Date {
  const today = startOfDay(now);
  if (period === 'day') return addDays(today, -1);
  if (period === 'week') return addDays(getWeekStart(today, weekStartsOn), -7);
  if (period === 'month') return addMonths(new Date(today.getFullYear(), today.getMonth(), 1), -1);
  return new Date(today.getFullYear() - 1, 0, 15);
}

function daysInPeriod(start: Date, end: Date) {
  const s = startOfDay(start).getTime();
  const e = startOfDay(end).getTime();
  return Math.max(1, Math.round((e - s) / 86400000) + 1);
}

function weekdayBucket(d: Date, weekStartsOn: 0 | 1) {
  const day = d.getDay();
  if (weekStartsOn === 1) return day === 0 ? 6 : day - 1;
  return day;
}

function inPeriod(task: Task, start: Date, end: Date) {
  const t = new Date(task.startAt);
  return t >= start && t <= end;
}

function isPast(task: Task, now: Date) {
  return new Date(task.endAt).getTime() < now.getTime();
}

function pct(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function deltaPct(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

function accumulatePeriod(
  tasks: Task[],
  start: Date,
  end: Date,
  weekStartsOn: 0 | 1,
  now: Date,
): PeriodMetrics {
  const m = emptyMetrics();

  for (const task of tasks) {
    if (!inPeriod(task, start, end)) continue;
    const h = taskHours(task);
    const cat = m.byCategory[task.category];
    cat.taskCount += 1;
    cat.hoursScheduled += h;
    m.hoursScheduled += h;
    m.tasksTotal += 1;

    const dateKey = toLocalDateString(new Date(task.startAt));
    m.hoursByDate.set(dateKey, (m.hoursByDate.get(dateKey) ?? 0) + h);
    m.hoursByWeekday[weekdayBucket(new Date(task.startAt), weekStartsOn)] += h;

    if (task.important) {
      m.importantCount += 1;
      m.importantScheduled += h;
    }

    if (task.status === 'completed') {
      cat.hoursCompleted += h;
      m.hoursCompleted += h;
      m.tasksCompleted += 1;
      if (task.important) m.importantCompleted += h;
      if (isPast(task, now)) {
        m.hoursPastClosed += h;
        m.tasksPastClosed += 1;
      }
    } else if (isPast(task, now)) {
      cat.hoursMissed += h;
      m.hoursMissed += h;
      m.tasksMissed += 1;
      m.hoursPastOverdue += h;
      m.tasksPastOverdue += 1;
    } else {
      cat.hoursPlanned += h;
      m.hoursPlanned += h;
      m.tasksPlanned += 1;
    }
  }

  return m;
}

function computeTails(tasks: Task[], now: Date) {
  const stale: StaleTaskItem[] = [];
  let over3Count = 0;
  let over3Hours = 0;
  let over7Count = 0;
  let over7Hours = 0;

  for (const task of tasks) {
    if (task.status === 'completed') continue;
    const endMs = new Date(task.endAt).getTime();
    if (endMs >= now.getTime()) continue;
    const daysOpen = Math.floor((now.getTime() - endMs) / 86400000);
    if (daysOpen < 3) continue;
    const h = taskHours(task);
    stale.push({ id: task.id, title: task.title, daysOpen, hours: h, startAt: task.startAt });
    over3Count += 1;
    over3Hours += h;
    if (daysOpen >= 7) {
      over7Count += 1;
      over7Hours += h;
    }
  }

  stale.sort((a, b) => b.daysOpen - a.daysOpen || a.startAt.localeCompare(b.startAt));
  return {
    over3Days: { count: over3Count, hours: over3Hours },
    over7Days: { count: over7Count, hours: over7Hours },
    oldest: stale.slice(0, 5),
  };
}

function busiestWeekday(hoursByWeekday: number[], weekStartsOn: 0 | 1) {
  let max = 0;
  let idx = -1;
  hoursByWeekday.forEach((h, i) => {
    if (h > max) {
      max = h;
      idx = i;
    }
  });
  if (idx < 0 || max <= 0) return { label: null, hours: 0 };
  const mapMonFirst = weekStartsOn === 1 ? idx : (idx + 6) % 7;
  const raw = WEEKDAY_NAMES[mapMonFirst];
  const label = raw ? raw.charAt(0) + raw.slice(1).toLowerCase() : null;
  return { label, hours: max };
}

export function computeTaskStats(
  tasks: Task[],
  period: StatsPeriod,
  weekStartsOn: 0 | 1,
  now = new Date(),
): TaskStatsReport {
  const { start, end, label } = periodRange(period, weekStartsOn, now);
  const current = accumulatePeriod(tasks, start, end, weekStartsOn, now);

  const prevAnchor = previousPeriodAnchor(period, weekStartsOn, now);
  const prevRange = periodRange(period, weekStartsOn, prevAnchor);
  const previous = accumulatePeriod(tasks, prevRange.start, prevRange.end, weekStartsOn, now);

  const pastHoursTotal = current.hoursPastClosed + current.hoursPastOverdue;
  const days = daysInPeriod(start, end);
  const busy = busiestWeekday(current.hoursByWeekday, weekStartsOn);
  const tails = computeTails(tasks, now);

  const diffHours = current.hoursCompleted - current.hoursScheduled;

  return {
    periodLabel: label,
    hasData: current.hoursScheduled > 0,
    hours: {
      scheduled: current.hoursScheduled,
      completed: current.hoursCompleted,
      completionPct: pct(current.hoursCompleted, current.hoursScheduled),
    },
    past: {
      hoursClosed: current.hoursPastClosed,
      hoursOverdue: current.hoursPastOverdue,
      closedPct: pct(current.hoursPastClosed, pastHoursTotal),
      tasksClosed: current.tasksPastClosed,
      tasksOverdue: current.tasksPastOverdue,
    },
    byCategory: current.byCategory,
    load: {
      avgHoursPerDay: current.hoursScheduled / days,
      daysInPeriod: days,
      busiestWeekday: busy.label,
      busiestWeekdayHours: busy.hours,
    },
    planFact: {
      plannedHours: current.hoursScheduled,
      actualHours: current.hoursCompleted,
      diffHours,
      diffPct: current.hoursScheduled > 0 ? pct(diffHours, current.hoursScheduled) : null,
    },
    important: {
      hoursScheduled: current.importantScheduled,
      hoursCompleted: current.importantCompleted,
      completionPct: pct(current.importantCompleted, current.importantScheduled),
      taskCount: current.importantCount,
    },
    dynamics: {
      hasPrevious: previous.hoursScheduled > 0 || previous.hoursCompleted > 0,
      previousLabel: prevRange.label,
      completedHoursDeltaPct: deltaPct(current.hoursCompleted, previous.hoursCompleted),
    },
    tails,
    tasks: {
      total: current.tasksTotal,
      completed: current.tasksCompleted,
      planned: current.tasksPlanned,
      missed: current.tasksMissed,
    },
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
  return CATEGORY_META[cat].label;
}

export function formatHours(h: number) {
  if (h <= 0) return '0 мин';
  if (h < 1) return `${Math.round(h * 60)} мин`;
  const whole = Math.floor(h);
  const mins = Math.round((h - whole) * 60);
  if (mins === 0) return `${whole} ч`;
  return `${whole} ч ${mins} мин`;
}

export function formatSignedHours(h: number) {
  const sign = h > 0 ? '+' : h < 0 ? '−' : '';
  return `${sign}${formatHours(Math.abs(h))}`;
}

export function formatDeltaPct(delta: number | null) {
  if (delta === null) return null;
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta}%`;
}

export function dynamicsText(period: StatsPeriod, delta: number | null) {
  if (delta === null) return null;
  const periodWord =
    period === 'day' ? 'прошлым днём' :
    period === 'week' ? 'прошлой неделей' :
    period === 'month' ? 'прошлым месяцем' :
    'прошлым годом';
  const sign = formatDeltaPct(delta);
  return `${sign} выполнено по времени vs ${periodWord}`;
}
