import type { Task } from '../types';
import { cloudFetch, isCloudAccountEnabled } from './accountApi';
import { normalizeEmail } from './authLocal';

type CalendarSyncState = {
  revision: number;
  snapshot: Task[];
  updatedAt: string | null;
};

async function syncFetch<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const response = await cloudFetch(path, init);
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

  const response = await cloudFetch('/v1/sync/calendar', {
    method: 'PUT',
    json: { baseRevision, snapshot: tasks },
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

const CALENDAR_REV_PREFIX = 'tili-calendar-sync-revision';

function calendarRevisionKey(accountEmail: string): string {
  return `${CALENDAR_REV_PREFIX}:${normalizeEmail(accountEmail)}`;
}

export function readCalendarSyncRevision(accountEmail: string): number {
  try {
    const scoped = localStorage.getItem(calendarRevisionKey(accountEmail));
    if (scoped == null) return 0;
    const n = Number(scoped);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function writeCalendarSyncRevision(revision: number, accountEmail: string) {
  try {
    localStorage.setItem(calendarRevisionKey(accountEmail), String(revision));
  } catch {
    /* private mode */
  }
}
