import type { GridClipItem, GridClipboard, Task } from '../types';
import { newTaskId } from './id';
import { getWeekDays, toLocalDateString } from './date';
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
  return { kind: 'week', items };
}

export function copyDayClipboard(tasks: Task[], day: Date): GridClipboard {
  const dateStr = toLocalDateString(day);
  const items = tasks
    .filter((task) => isCopyable(task) && toLocalDateString(new Date(task.startAt)) === dateStr)
    .map((task) => toItem(task, 0))
    .sort((a, b) => a.hour - b.hour || a.order - b.order);
  return { kind: 'day', items };
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
  return { kind: 'hour', items };
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

function draftFromItem(item: GridClipItem, day: Date, hour: number): Task {
  const now = new Date().toISOString();
  const start = new Date(day);
  start.setHours(hour, 0, 0, 0);
  const end = new Date(start);
  end.setHours(hour + 1, 0, 0, 0);
  return {
    id: newTaskId(),
    title: item.title,
    description: item.description,
    category: item.category,
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    status: 'active',
    important: item.important,
    reminderOffsetMinutes: item.reminderOffsetMinutes,
    order: item.order,
    createdAt: now,
    updatedAt: now,
  };
}

export function buildPastedTasks(
  clipboard: GridClipboard,
  target: { kind: 'week'; focusDate: Date; weekStartsOn: 0 | 1 }
    | { kind: 'day'; day: Date }
    | { kind: 'hour'; day: Date; hour: number },
): Task[] {
  if (target.kind === 'week') {
    const days = getWeekDays(target.focusDate, target.weekStartsOn);
    const bySlot = new Map<string, Task[]>();
    for (const item of clipboard.items) {
      const day = days[item.dayOffset];
      if (!day) continue;
      const key = `${toLocalDateString(day)}-${item.hour}`;
      const list = bySlot.get(key) ?? [];
      if (list.length >= MAX_TASKS_PER_HOUR) continue;
      list.push(draftFromItem(item, day, item.hour));
      bySlot.set(key, list);
    }
    return flattenRebalanced(bySlot);
  }

  if (target.kind === 'day') {
    const bySlot = new Map<string, Task[]>();
    for (const item of clipboard.items) {
      const key = `${toLocalDateString(target.day)}-${item.hour}`;
      const list = bySlot.get(key) ?? [];
      if (list.length >= MAX_TASKS_PER_HOUR) continue;
      list.push(draftFromItem(item, target.day, item.hour));
      bySlot.set(key, list);
    }
    return flattenRebalanced(bySlot);
  }

  const hourItems = clipboard.items.slice(0, MAX_TASKS_PER_HOUR);
  const list = hourItems.map((item) => draftFromItem(item, target.day, target.hour));
  const key = `${toLocalDateString(target.day)}-${target.hour}`;
  return flattenRebalanced(new Map([[key, list]]));
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

export function clipKindLabel(kind: GridClipboard['kind']) {
  if (kind === 'week') return 'неделя';
  if (kind === 'day') return 'день';
  return 'час';
}
