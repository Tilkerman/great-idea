import { normalizeEmail } from './authLocal';

const CALENDAR_PENDING = 'tili-calendar-pending-upload';
const LUMI_PENDING = 'tili-lumi-pending-upload';

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
  markPendingCalendarUpload(email);
  markPendingLumiUpload(email);
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
