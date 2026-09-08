import Dexie, { type EntityTable } from 'dexie';
import type { Task, UserSettings } from '../types';
import { DEFAULT_SETTINGS } from '../constants/categories';

export class TiLiDB extends Dexie {
  tasks!: EntityTable<Task, 'id'>;
  settings!: EntityTable<UserSettings & { id: string }, 'id'>;

  constructor() {
    super('tili-calendar');
    this.version(1).stores({
      tasks: 'id, startAt, endAt, category, status',
      settings: 'id',
    });
  }
}

export const db = new TiLiDB();

export async function getSettings(): Promise<UserSettings> {
  const row = await db.settings.get('main');
  return row ?? { ...DEFAULT_SETTINGS };
}

export async function saveSettings(settings: UserSettings) {
  await db.settings.put({ ...settings, id: 'main' });
}

export async function getAllTasks() {
  return db.tasks.orderBy('startAt').toArray();
}

export async function getTasksForRange(startISO: string, endISO: string) {
  return db.tasks
    .where('startAt')
    .between(startISO, endISO, true, true)
    .toArray();
}

export async function saveTask(task: Task) {
  await db.tasks.put(task);
}

export async function saveTasks(tasks: Task[]) {
  if (tasks.length === 0) return;
  await db.tasks.bulkPut(tasks);
}

export async function deleteTask(id: string) {
  await db.tasks.delete(id);
}

export async function seedIfEmpty(seed: Task[]) {
  const count = await db.tasks.count();
  if (count === 0) {
    await db.tasks.bulkAdd(seed);
  }
}

export async function exportData() {
  const tasks = await getAllTasks();
  const settings = await getSettings();
  return JSON.stringify({ tasks, settings, exportedAt: new Date().toISOString() }, null, 2);
}

export async function clearAllData() {
  await db.tasks.clear();
}
