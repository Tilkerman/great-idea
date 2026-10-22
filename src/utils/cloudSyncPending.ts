import { normalizeEmail } from './authLocal';

export type CloudSyncKind = 'calendar' | 'lumi';

const CALENDAR_PENDING = 'tili-calendar-pending-upload';
const LUMI_PENDING = 'tili-lumi-pending-upload';
const OWNER_KEY: Record<CloudSyncKind, string> = {
  calendar: 'tili-cloud-data-owner-calendar',
  lumi: 'tili-cloud-data-owner-lumi',
};
const DIRTY_PREFIX: Record<CloudSyncKind, string> = {
  calendar: 'tili-calendar-cloud-dirty',
  lumi: 'tili-lumi-cloud-dirty',
};

function key(prefix: string, email: string): string {
  return `${prefix}:${normalizeEmail(email)}`;
}

export function markPendingCalendarUpload(email: string) {
  try {
    localStorage.setItem(key(CALENDAR_PENDING, email), '1');
  } catch {
    /* private mode */
  }
}

export function markPendingLumiUpload(email: string) {
  try {
    localStorage.setItem(key(LUMI_PENDING, email), '1');
  } catch {
    /* private mode */
  }
}

export function markPendingCloudUpload(email: string) {
  // Only unowned local data is guest data. Data owned by another account must
  // never be migrated into a newly registered account on the same browser.
  if (!readCloudDataOwner('calendar')) markPendingCalendarUpload(email);
  if (!readCloudDataOwner('lumi')) markPendingLumiUpload(email);
}

export function consumePendingCalendarUpload(email: string): boolean {
  try {
    const k = key(CALENDAR_PENDING, email);
    if (localStorage.getItem(k) !== '1') return false;
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

export function peekPendingCalendarUpload(email: string): boolean {
  try {
    return localStorage.getItem(key(CALENDAR_PENDING, email)) === '1';
  } catch {
    return false;
  }
}

export function consumePendingLumiUpload(email: string): boolean {
  try {
    const k = key(LUMI_PENDING, email);
    if (localStorage.getItem(k) !== '1') return false;
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

export function peekPendingLumiUpload(email: string): boolean {
  try {
    return localStorage.getItem(key(LUMI_PENDING, email)) === '1';
  } catch {
    return false;
  }
}

export function readCloudDataOwner(kind: CloudSyncKind): string {
  try {
    return localStorage.getItem(OWNER_KEY[kind]) ?? '';
  } catch {
    return '';
  }
}

export function writeCloudDataOwner(kind: CloudSyncKind, email: string) {
  try {
    localStorage.setItem(OWNER_KEY[kind], normalizeEmail(email));
  } catch {
    /* private mode */
  }
}

function dirtyKey(kind: CloudSyncKind, email: string): string {
  return `${DIRTY_PREFIX[kind]}:${normalizeEmail(email)}`;
}

export function markCloudDataDirty(kind: CloudSyncKind, email: string) {
  try {
    localStorage.setItem(dirtyKey(kind, email), '1');
  } catch {
    /* private mode */
  }
}

export function isCloudDataDirty(kind: CloudSyncKind, email: string): boolean {
  try {
    return localStorage.getItem(dirtyKey(kind, email)) === '1';
  } catch {
    return false;
  }
}

export function clearCloudDataDirty(kind: CloudSyncKind, email: string) {
  try {
    localStorage.removeItem(dirtyKey(kind, email));
  } catch {
    /* private mode */
  }
}
