import type { Task } from '../types';
import { accountApiBase, isCloudAccountEnabled } from './accountApi';

type CalendarSyncState = {
  revision: number;
  snapshot: Task[];
  updatedAt: string | null;
};

async function syncFetch<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const base = accountApiBase();
  if (!base) throw new Error('cloud_disabled');

  const headers = new Headers(init?.headers);
  let body = init?.body;
  if (init?.json !== undefined) {
    headers.set('content-type', 'application/json');
    body = JSON.stringify(init.json);
  }

  const response = await fetch(`${base}${path}`, {
    ...init,
    headers,
    body,
    credentials: 'include',
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload.error === 'string' ? payload.error : 'sync_failed');
  }
  return payload as T;
}

export async function pullCalendarFromCloud(): Promise<CalendarSyncState | null> {
  if (!isCloudAccountEnabled()) return null;
  const data = await syncFetch<CalendarSyncState>('/v1/sync/calendar');
  return {
    revision: data.revision,
    snapshot: Array.isArray(data.snapshot) ? data.snapshot as Task[] : [],
    updatedAt: data.updatedAt ?? null,
  };
}

export async function pushCalendarToCloud(
  tasks: Task[],
  baseRevision: number,
): Promise<{ revision: number } | { conflict: true; revision: number; snapshot: Task[] }> {
  if (!isCloudAccountEnabled()) throw new Error('cloud_disabled');

  const base = accountApiBase()!;
  const response = await fetch(`${base}/v1/sync/calendar`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ baseRevision, snapshot: tasks }),
  });
  const payload = await response.json().catch(() => ({})) as {
    revision?: number;
    snapshot?: Task[];
    error?: string;
  };

  if (response.status === 409 && payload.error === 'revision_conflict') {
    return {
      conflict: true,
      revision: payload.revision ?? 0,
      snapshot: Array.isArray(payload.snapshot) ? payload.snapshot : [],
    };
  }
  if (!response.ok) throw new Error('sync_failed');
  return { revision: payload.revision ?? baseRevision + 1 };
}

const CALENDAR_REV_KEY = 'tili-calendar-sync-revision';

export function readCalendarSyncRevision(): number {
  try {
    const raw = localStorage.getItem(CALENDAR_REV_KEY);
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function writeCalendarSyncRevision(revision: number) {
  try {
    localStorage.setItem(CALENDAR_REV_KEY, String(revision));
  } catch {
    /* private mode */
  }
}
