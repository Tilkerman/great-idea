import type { Task } from '../types';
import { isUnscheduledTask } from './hourSlot';

const DUE_NOW_KEY = 'tili-push-due-now';

function calendarHourStartMs(task: Task): number | null {
  const start = new Date(task.startAt);
  if (!Number.isFinite(start.getTime())) return null;
  const hourStart = new Date(start);
  hourStart.setMinutes(0, 0, 0);
  return hourStart.getTime();
}

/** «За N минут» и «вовремя» — от начала календарного часа, не от 15‑мин слота внутри часа. */
export function reminderFireAtMs(task: Task): number | null {
  if (task.status === 'completed' || isUnscheduledTask(task)) return null;
  if (task.reminderOffsetMinutes == null || task.reminderOffsetMinutes < 0) return null;
  const hourStart = calendarHourStartMs(task);
  if (hourStart == null) return null;
  if (task.reminderOffsetMinutes === 0) return hourStart;
  return hourStart - task.reminderOffsetMinutes * 60_000;
}

function calendarHourEndMs(task: Task) {
  const hourStart = calendarHourStartMs(task);
  if (hourStart == null) return NaN;
  return hourStart + 60 * 60 * 1000;
}

/** Догон, пока календарный час ещё идёт (не 15-минутный кусок внутри часа). */
export function reminderStillInSlot(task: Task, now = Date.now()) {
  const hourEnd = calendarHourEndMs(task);
  if (!Number.isFinite(hourEnd)) return false;
  return now < hourEnd + 2 * 60 * 1000;
}

function dueNowSent(): Set<string> {
  try {
    const raw = localStorage.getItem(DUE_NOW_KEY);
    return new Set(raw ? JSON.parse(raw) as string[] : []);
  } catch {
    return new Set();
  }
}

export function markCloudDueNowSent(ids: string[]) {
  if (!ids.length) return;
  const set = dueNowSent();
  for (const id of ids) set.add(id);
  localStorage.setItem(DUE_NOW_KEY, JSON.stringify([...set].slice(-80)));
}

export function alreadyCloudDueNow(taskId: string) {
  return dueNowSent().has(taskId);
}

/** Для облака: будущее время или догон, пока час ещё идёт (в т.ч. «вовремя»). */
export function cloudReminderFireAt(task: Task, now = Date.now()): { fireAt: number; dueNow: boolean } | null {
  const fireAt = reminderFireAtMs(task);
  if (fireAt == null) return null;
  if (fireAt > now) return { fireAt, dueNow: false };
  if (alreadyCloudDueNow(task.id)) return null;
  if (!reminderStillInSlot(task, now)) return null;
  return { fireAt: now, dueNow: true };
}
