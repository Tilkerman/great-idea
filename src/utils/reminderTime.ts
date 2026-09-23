import type { Task } from '../types';
import { isUnscheduledTask } from './hourSlot';

const DUE_NOW_KEY = 'tili-push-due-now';

export function reminderFireAtMs(task: Task): number | null {
  if (task.status === 'completed' || isUnscheduledTask(task)) return null;
  if (task.reminderOffsetMinutes == null || task.reminderOffsetMinutes < 0) return null;
  const start = new Date(task.startAt);
  if (!Number.isFinite(start.getTime())) return null;
  if (task.reminderOffsetMinutes === 0) {
    const hourStart = new Date(start);
    hourStart.setMinutes(0, 0, 0);
    return hourStart.getTime();
  }
  return start.getTime() - task.reminderOffsetMinutes * 60_000;
}

function calendarHourEndMs(task: Task) {
  const hourStart = new Date(task.startAt);
  if (!Number.isFinite(hourStart.getTime())) return NaN;
  hourStart.setMinutes(0, 0, 0);
  return hourStart.getTime() + 60 * 60 * 1000;
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
