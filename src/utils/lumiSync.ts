import type { ActionItem, Contact, Desire, Feedback, LifeAreaRating } from '../lumi/types';
import { db as lumiDb } from '../lumi/services/db';
import { accountApiBase, isCloudAccountEnabled } from './accountApi';

export type LumiSnapshot = {
  desires: Desire[];
  contacts: Contact[];
  lifeAreas: LifeAreaRating[];
  feedbacks: Feedback[];
  actionItems: ActionItem[];
};

type LumiSyncState = {
  revision: number;
  snapshot: LumiSnapshot;
  updatedAt: string | null;
};

function emptySnapshot(): LumiSnapshot {
  return { desires: [], contacts: [], lifeAreas: [], feedbacks: [], actionItems: [] };
}

function asSnapshot(value: unknown): LumiSnapshot {
  if (!value || typeof value !== 'object') return emptySnapshot();
  const row = value as Partial<LumiSnapshot>;
  return {
    desires: Array.isArray(row.desires) ? row.desires : [],
    contacts: Array.isArray(row.contacts) ? row.contacts : [],
    lifeAreas: Array.isArray(row.lifeAreas) ? row.lifeAreas : [],
    feedbacks: Array.isArray(row.feedbacks) ? row.feedbacks : [],
    actionItems: Array.isArray(row.actionItems) ? row.actionItems : [],
  };
}

export async function readLocalLumiSnapshot(): Promise<LumiSnapshot> {
  await lumiDb.open();
  const [desires, contacts, lifeAreas, feedbacks, actionItems] = await Promise.all([
    lumiDb.desires.toArray(),
    lumiDb.contacts.toArray(),
    lumiDb.lifeAreas.toArray(),
    lumiDb.feedbacks.toArray(),
    lumiDb.actionItems.toArray(),
  ]);
  return { desires, contacts, lifeAreas, feedbacks, actionItems };
}

export async function replaceLocalLumiSnapshot(snapshot: LumiSnapshot): Promise<void> {
  const data = asSnapshot(snapshot);
  await lumiDb.open();
  await lumiDb.transaction(
    'rw',
    lumiDb.desires,
    lumiDb.contacts,
    lumiDb.lifeAreas,
    lumiDb.feedbacks,
    lumiDb.actionItems,
    async () => {
      await lumiDb.desires.clear();
      await lumiDb.contacts.clear();
      await lumiDb.lifeAreas.clear();
      await lumiDb.feedbacks.clear();
      await lumiDb.actionItems.clear();
      if (data.desires.length > 0) await lumiDb.desires.bulkPut(data.desires);
      if (data.contacts.length > 0) await lumiDb.contacts.bulkPut(data.contacts);
      if (data.lifeAreas.length > 0) await lumiDb.lifeAreas.bulkPut(data.lifeAreas);
      if (data.feedbacks.length > 0) await lumiDb.feedbacks.bulkPut(data.feedbacks);
      if (data.actionItems.length > 0) await lumiDb.actionItems.bulkPut(data.actionItems);
    },
  );
}

export async function pullLumiFromCloud(): Promise<LumiSyncState | null> {
  if (!isCloudAccountEnabled()) return null;
  const base = accountApiBase();
  if (!base) return null;

  const response = await fetch(`${base}/v1/sync/lumi`, {
    credentials: 'include',
    headers: { accept: 'application/json' },
  });
  const payload = await response.json().catch(() => ({})) as {
    revision?: number;
    snapshot?: unknown;
    updatedAt?: string | null;
    error?: string;
  };
  if (!response.ok) {
    throw new Error(typeof payload.error === 'string' ? payload.error : 'sync_failed');
  }
  return {
    revision: payload.revision ?? 0,
    snapshot: asSnapshot(payload.snapshot),
    updatedAt: payload.updatedAt ?? null,
  };
}

export async function pushLumiToCloud(
  snapshot: LumiSnapshot,
  baseRevision: number,
): Promise<{ revision: number } | { conflict: true; revision: number; snapshot: LumiSnapshot }> {
  if (!isCloudAccountEnabled()) throw new Error('cloud_disabled');
  const base = accountApiBase();
  if (!base) throw new Error('cloud_disabled');

  const response = await fetch(`${base}/v1/sync/lumi`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ baseRevision, snapshot }),
  });
  const payload = await response.json().catch(() => ({})) as {
    revision?: number;
    snapshot?: unknown;
    error?: string;
  };

  if (response.status === 409 && payload.error === 'revision_conflict') {
    return {
      conflict: true,
      revision: payload.revision ?? 0,
      snapshot: asSnapshot(payload.snapshot),
    };
  }
  if (!response.ok) throw new Error('sync_failed');
  return { revision: payload.revision ?? baseRevision + 1 };
}

const LUMI_REV_KEY = 'tili-lumi-sync-revision';

export function readLumiSyncRevision(): number {
  try {
    const raw = localStorage.getItem(LUMI_REV_KEY);
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function writeLumiSyncRevision(revision: number) {
  try {
    localStorage.setItem(LUMI_REV_KEY, String(revision));
  } catch {
    /* private mode */
  }
}
