import type { ActionItem } from '../lumi/types';
import { actionItemService, desireService } from '../lumi/services/db';
import { db as tiliDb } from '../db';
import type { Task } from '../types';
import { newTaskId } from './id';
import { clearLumiFieldsOnTask } from './wishTaskUnlink';

export function taskHasLumiLink(task: Task) {
  return Boolean(task.lumiDesireId && task.lumiActionItemId);
}

export function createLumiStepDraft(item: ActionItem, desireTitle: string): Task {
  const now = new Date().toISOString();
  return {
    id: newTaskId(),
    title: item.text,
    category: 'personal',
    startAt: '',
    endAt: '',
    status: 'active',
    important: false,
    reminderOffsetMinutes: null,
    order: 1,
    createdAt: now,
    updatedAt: now,
    lumiDesireId: item.desireId,
    lumiActionItemId: item.id,
    lumiDesireTitle: desireTitle,
  };
}

export async function afterTaskWritten(task: Task) {
  if (!task.lumiActionItemId) return;
  const item = await actionItemService.getActionItem(task.lumiActionItemId);
  if (!item) return;
  const done = task.status === 'completed';
  let desireTitle = task.lumiDesireTitle ?? null;
  if (task.lumiDesireId) {
    const desire = await desireService.getDesireById(task.lumiDesireId);
    desireTitle = desire?.title ?? desireTitle;
  }
  await actionItemService.updateActionItem(item.id, {
    linkedTaskId: task.id,
    isCompleted: done,
    completedAt: done ? (item.completedAt ?? new Date().toISOString()) : null,
  });
  if (desireTitle && desireTitle !== task.lumiDesireTitle) {
    await tiliDb.tasks.update(task.id, { lumiDesireTitle: desireTitle });
  }
}

export async function afterTaskDeleted(task: Task) {
  const stepId = task.lumiActionItemId;
  if (stepId) {
    await actionItemService.updateActionItem(stepId, { linkedTaskId: null });
    return;
  }
  const linked = await actionItemService.getByLinkedTaskId(task.id);
  if (linked) {
    await actionItemService.updateActionItem(linked.id, { linkedTaskId: null });
  }
}

export async function afterStepToggled(itemId: string) {
  const item = await actionItemService.getActionItem(itemId);
  if (!item?.linkedTaskId) return;
  const task = await tiliDb.tasks.get(item.linkedTaskId);
  if (!task) {
    await actionItemService.updateActionItem(item.id, { linkedTaskId: null });
    return;
  }
  const nextStatus = item.isCompleted ? 'completed' : 'active';
  if (task.status === nextStatus) return;
  await tiliDb.tasks.update(task.id, {
    status: nextStatus,
    updatedAt: new Date().toISOString(),
  });
}

export async function repairStepLink(item: ActionItem): Promise<ActionItem> {
  if (!item.linkedTaskId) return item;
  const task = await tiliDb.tasks.get(item.linkedTaskId);
  if (task) return item;
  await actionItemService.updateActionItem(item.id, { linkedTaskId: null });
  return { ...item, linkedTaskId: null };
}

export async function repairDesireLinks(items: ActionItem[]): Promise<ActionItem[]> {
  const next: ActionItem[] = [];
  for (const item of items) next.push(await repairStepLink(item));
  return next;
}

export async function unlinkTasksForDesire(desireId: string) {
  const items = await actionItemService.getActionItemsByDesire(desireId);
  for (const item of items) {
    if (item.linkedTaskId) await clearLumiFieldsOnTask(item.linkedTaskId);
  }
}
