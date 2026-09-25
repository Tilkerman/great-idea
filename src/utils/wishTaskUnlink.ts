import { db } from '../db';
import type { Task } from '../types';

export function stripLumiLink(task: Task): Task {
  const next: Task = { ...task, updatedAt: new Date().toISOString() };
  delete next.lumiDesireId;
  delete next.lumiActionItemId;
  delete next.lumiDesireTitle;
  return next;
}

export async function clearLumiFieldsOnTask(taskId: string) {
  const task = await db.tasks.get(taskId);
  if (!task) return;
  if (!task.lumiActionItemId && !task.lumiDesireId) return;
  await db.tasks.put(stripLumiLink(task));
}
