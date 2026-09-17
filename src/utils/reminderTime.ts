import type { Task } from '../types';
import { isUnscheduledTask } from './hourSlot';

const DUE_NOW_KEY = 'tili-push-due-now';

export function reminderFireAtMs(task: Task): number | null {
  if (task.status === 'completed' || isUnscheduledTask(task)) return null;
  if (task.reminderOffsetMinutes == null || task.reminderOffsetMinutes < 0) return null;
  const start = new Date(task.startAt).getTime();
  if (!Number.isFinite(start)) return null;
  return start - task.reminderOffsetMinutes * 60_000;
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

/** Для облака: будущее время или один раз «уже пора», если дело ещё идёт. */
export function cloudReminderFireAt(task: Task, now = Date.now()): { fireAt: number; dueNow: boolean } | null {
  const fireAt = reminderFireAtMs(task);
  if (fireAt == null) return null;
  if (fireAt > now) return { fireAt, dueNow: false };
  const end = new Date(task.endAt || task.startAt).getTime();
  if (!Number.isFinite(end) || end <= now) return null;
  if (alreadyCloudDueNow(task.id)) return null;
  return { fireAt: now, dueNow: true };
}
