import type { Task } from '../types';
import { newTaskId } from './id';
import { toLocalDateString } from './date';

/** Максимум дел в одном часе */
export const MAX_TASKS_PER_HOUR = 5;

/** Длительность одного дела при 4+ задачах в часе (4×15 = 60) */
export const SUB_TASK_MIN = 15;

/** Длительность при 5 задачах в часе (5×12 = 60) */
export const SUB_TASK_MIN_FIVE = 12;

export function hourSlotKey(dateStr: string, hour: number) {
  return `${dateStr}-${hour}`;
}

export function getHourFromTask(task: Task) {
  return new Date(task.startAt).getHours();
}

export function getDateStrFromTask(task: Task) {
  return toLocalDateString(new Date(task.startAt));
}

export function getTasksInHour(tasks: Task[], dateStr: string, hour: number): Task[] {
  return tasks
    .filter((t) => {
      const d = new Date(t.startAt);
      return toLocalDateString(d) === dateStr && d.getHours() === hour;
    })
    .sort((a, b) => a.order - b.order);
}

export function durationMinutesForCount(count: number): number {
  if (count <= 1) return 60;
  if (count <= 4) return SUB_TASK_MIN;
  return SUB_TASK_MIN_FIVE;
}

/** Пересчитать startAt/endAt и order для всех дел в часе */
export function rebalanceHourTasks(day: Date, hour: number, tasksInHour: Task[]): Task[] {
  const sorted = [...tasksInHour].sort((a, b) => a.order - b.order);
  const count = sorted.length;
  const dur = durationMinutesForCount(count);
  const base = new Date(day);
  base.setHours(hour, 0, 0, 0);

  return sorted.map((t, i) => {
    const start = new Date(base);
    start.setMinutes(start.getMinutes() + i * dur);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + dur);
    return {
      ...t,
      order: i + 1,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
}

export function createDraftTask(day: Date, hour: number, existing: Task[]): Task {
  const nextOrder = existing.length + 1;
  const countAfter = existing.length + 1;
  const dur = durationMinutesForCount(countAfter);
  const base = new Date(day);
  base.setHours(hour, 0, 0, 0);
  const start = new Date(base);
  start.setMinutes((nextOrder - 1) * dur);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + dur);

  return {
    id: newTaskId(),
    title: '',
    category: 'work',
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    status: 'active',
    important: false,
    reminderOffsetMinutes: null,
    order: nextOrder,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function canAddToHour(existingCount: number) {
  return existingCount < MAX_TASKS_PER_HOUR;
}
