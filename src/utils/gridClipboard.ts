import type { GridClipItem, GridClipboard, Locale, Task } from '../types';
import { tLocale } from '../i18n/catalog';
import { newTaskId } from './id';
import { formatWeekHeaderTitle, getWeekDays, getWeekStart, localDateFromYmd, toLocalDateString } from './date';
import { MAX_TASKS_PER_HOUR, rebalanceHourTasks } from './hourSlot';

function isCopyable(task: Task) {
  return task.status !== 'completed';
}

function toItem(task: Task, dayOffset: number): GridClipItem {
  return {
    dayOffset,
    hour: new Date(task.startAt).getHours(),
    title: task.title,
    description: task.description,
    category: task.category,
    important: task.important,
    reminderOffsetMinutes: task.reminderOffsetMinutes,
    order: task.order,
  };
}

export function copyWeekClipboard(
  tasks: Task[],
  focusDate: Date,
  weekStartsOn: 0 | 1,
): GridClipboard {
  const days = getWeekDays(focusDate, weekStartsOn);
  const index = new Map(days.map((d, i) => [toLocalDateString(d), i]));
  const items = tasks
    .filter(isCopyable)
    .map((task) => {
      const offset = index.get(toLocalDateString(new Date(task.startAt)));
      return offset === undefined ? null : toItem(task, offset);
    })
    .filter((item): item is GridClipItem => item !== null)
    .sort((a, b) => a.dayOffset - b.dayOffset || a.hour - b.hour || a.order - b.order);
  return {
    kind: 'week',
    items,
    sourceWeekStart: toLocalDateString(getWeekStart(focusDate, weekStartsOn)),
  };
}

export function copyDayClipboard(tasks: Task[], day: Date): GridClipboard {
  const dateStr = toLocalDateString(day);
  const items = tasks
    .filter((task) => isCopyable(task) && toLocalDateString(new Date(task.startAt)) === dateStr)
    .map((task) => toItem(task, 0))
    .sort((a, b) => a.hour - b.hour || a.order - b.order);
  return { kind: 'day', items, sourceDay: dateStr };
}

export function copyHourClipboard(tasks: Task[], day: Date, hour: number): GridClipboard {
  const dateStr = toLocalDateString(day);
  const items = tasks
    .filter((task) => {
      if (!isCopyable(task)) return false;
      const start = new Date(task.startAt);
      return toLocalDateString(start) === dateStr && start.getHours() === hour;
    })
    .map((task) => toItem(task, 0))
    .sort((a, b) => a.order - b.order);
  return { kind: 'hour', items, sourceDay: dateStr, sourceHour: hour };
}

export function countTasksInWeek(tasks: Task[], focusDate: Date, weekStartsOn: 0 | 1) {
  const dates = new Set(getWeekDays(focusDate, weekStartsOn).map(toLocalDateString));
  return tasks.filter((task) => dates.has(toLocalDateString(new Date(task.startAt)))).length;
}

export function countTasksInDay(tasks: Task[], day: Date) {
  const dateStr = toLocalDateString(day);
  return tasks.filter((task) => toLocalDateString(new Date(task.startAt)) === dateStr).length;
}

export function countTasksInHour(tasks: Task[], day: Date, hour: number) {
  const dateStr = toLocalDateString(day);
  return tasks.filter((task) => {
    const start = new Date(task.startAt);
    return toLocalDateString(start) === dateStr && start.getHours() === hour;
  }).length;
}

function draftFromItem(item: GridClipItem, day: Date, hour: number): Task | null {
  const hourSafe = Number.isFinite(hour) ? Math.min(23, Math.max(0, Math.floor(hour))) : 0;
  const start = new Date(day);
  if (Number.isNaN(start.getTime())) return null;
  start.setHours(hourSafe, 0, 0, 0);
  const end = new Date(start);
  end.setHours(hourSafe + 1, 0, 0, 0);
  try {
    const now = new Date().toISOString();
    return {
      id: newTaskId(),
      title: item.title,
      description: item.description,
      category: item.category,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      status: 'active',
      important: item.important,
      reminderOffsetMinutes: item.reminderOffsetMinutes ?? null,
      order: item.order,
      createdAt: now,
      updatedAt: now,
    };
  } catch {
    return null;
  }
}

export function weekdayOffset(day: Date, weekStartsOn: 0 | 1): number {
  const key = toLocalDateString(day);
  const i = getWeekDays(day, weekStartsOn).findIndex((d) => toLocalDateString(d) === key);
  return i < 0 ? 0 : i;
}

type PasteTarget = { kind: 'week'; focusDate: Date; weekStartsOn: 0 | 1 }
  | { kind: 'day'; day: Date; weekStartsOn: 0 | 1 }
  | { kind: 'hour'; day: Date; hour: number; weekStartsOn: 0 | 1 };

function itemsForTarget(
  clipboard: GridClipboard,
  target: PasteTarget,
): GridClipItem[] {
  const { weekStartsOn } = target;
  if (target.kind === 'week') {
    if (clipboard.kind === 'week') return clipboard.items;
    const src = clipboard.sourceDay ? localDateFromYmd(clipboard.sourceDay) : null;
    const offset = src ? weekdayOffset(src, weekStartsOn) : 0;
    return clipboard.items.map((item) => ({ ...item, dayOffset: offset }));
  }
  if (target.kind === 'day') {
    if (clipboard.kind === 'week') {
      const offset = weekdayOffset(target.day, weekStartsOn);
      return clipboard.items
        .filter((item) => item.dayOffset === offset)
        .map((item) => ({ ...item, dayOffset: 0 }));
    }
    return clipboard.items.map((item) => ({ ...item, dayOffset: 0 }));
  }
  if (clipboard.kind === 'week') {
    const offset = weekdayOffset(target.day, weekStartsOn);
    return clipboard.items
      .filter((item) => item.dayOffset === offset && item.hour === target.hour)
      .map((item) => ({ ...item, dayOffset: 0, hour: target.hour }));
  }
  if (clipboard.kind === 'day') {
    return clipboard.items
      .filter((item) => item.hour === target.hour)
      .map((item) => ({ ...item, dayOffset: 0, hour: target.hour }));
  }
  return clipboard.items.map((item) => ({ ...item, dayOffset: 0, hour: target.hour }));
}

function pushDraft(
  bySlot: Map<string, Task[]>,
  item: GridClipItem,
  day: Date,
  hour: number,
) {
  const draft = draftFromItem(item, day, hour);
  if (!draft) return;
  const key = `${toLocalDateString(day)}-${hour}`;
  const list = bySlot.get(key) ?? [];
  if (list.length >= MAX_TASKS_PER_HOUR) return;
  list.push(draft);
  bySlot.set(key, list);
}

export function buildPastedTasks(clipboard: GridClipboard, target: PasteTarget): Task[] {
  const items = itemsForTarget(clipboard, target);
  const bySlot = new Map<string, Task[]>();

  if (target.kind === 'week') {
    const days = getWeekDays(target.focusDate, target.weekStartsOn);
    for (const item of items) {
      const day = days[item.dayOffset];
      if (!day) continue;
      pushDraft(bySlot, item, day, item.hour);
    }
    return flattenRebalanced(bySlot);
  }

  if (target.kind === 'day') {
    for (const item of items) {
      pushDraft(bySlot, item, target.day, item.hour);
    }
    return flattenRebalanced(bySlot);
  }

  const hourItems = items.slice(0, MAX_TASKS_PER_HOUR);
  for (const item of hourItems) {
    pushDraft(bySlot, item, target.day, target.hour);
  }
  return flattenRebalanced(bySlot);
}

function flattenRebalanced(bySlot: Map<string, Task[]>): Task[] {
  const out: Task[] = [];
  for (const [key, list] of bySlot) {
    const parts = key.split('-');
    const hour = Number(parts.pop());
    const dayStr = parts.join('-');
    const [y, m, d] = dayStr.split('-').map(Number);
    const day = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
    out.push(...rebalanceHourTasks(day, hour, list));
  }
  return out;
}

export function idsInWeek(tasks: Task[], focusDate: Date, weekStartsOn: 0 | 1) {
  const dates = new Set(getWeekDays(focusDate, weekStartsOn).map(toLocalDateString));
  return tasks.filter((task) => dates.has(toLocalDateString(new Date(task.startAt)))).map((t) => t.id);
}

export function idsInDay(tasks: Task[], day: Date) {
  const dateStr = toLocalDateString(day);
  return tasks.filter((task) => toLocalDateString(new Date(task.startAt)) === dateStr).map((t) => t.id);
}

export function idsInHour(tasks: Task[], day: Date, hour: number) {
  const dateStr = toLocalDateString(day);
  return tasks.filter((task) => {
    const start = new Date(task.startAt);
    return toLocalDateString(start) === dateStr && start.getHours() === hour;
  }).map((t) => t.id);
}

export function clipKindLabel(kind: GridClipboard['kind'], locale: Locale = 'ru') {
  if (kind === 'week') return tLocale(locale, 'kindWeek');
  if (kind === 'day') return tLocale(locale, 'kindDay');
  return tLocale(locale, 'kindHour');
}

/** Диапазон или дата источника — не меняется при листании календаря после копирования. */
export function clipboardSourceLabel(
  clipboard: GridClipboard,
  weekStartsOn: 0 | 1,
  localeTag: string,
  monthsGen: readonly string[],
  locale: Locale = 'ru',
): string {
  if (clipboard.kind === 'week') {
    const anchor = clipboard.sourceWeekStart
      ? localDateFromYmd(clipboard.sourceWeekStart)
      : new Date();
    return formatWeekHeaderTitle(anchor, weekStartsOn, localeTag, monthsGen);
  }
  if (clipboard.sourceDay) {
    const day = localDateFromYmd(clipboard.sourceDay);
    const datePart = day.toLocaleDateString(localeTag, { day: 'numeric', month: 'long' });
    if (clipboard.kind === 'hour' && clipboard.sourceHour !== undefined) {
      const h = String(clipboard.sourceHour).padStart(2, '0');
      return `${datePart}, ${h}:00`;
    }
    return datePart;
  }
  return clipKindLabel(clipboard.kind, locale);
}
