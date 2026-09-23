import { newTaskId } from './id';
import { reminderNoticeBody } from './notifications';
import { tLocale } from '../i18n/catalog';
import { cloudReminderFireAt, markCloudDueNowSent } from './reminderTime';
import type { Locale, Task } from '../types';

const DEVICE_KEY = 'tili-push-device';

function vapidPublicKey() {
  return import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim() ?? '';
}

function pushApiUrl() {
  return import.meta.env.VITE_PUSH_API_URL?.trim().replace(/\/$/, '') ?? '';
}

export function cloudPushConfigured() {
  return Boolean(vapidPublicKey() && pushApiUrl());
}

export function pushDeviceId() {
  try {
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    const id = newTaskId();
    localStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    return newTaskId();
  }
}

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(base64.replace(/-/g, '+').replace(/_/g, '/') + padding);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function subscribeTiliPush(): Promise<'ok' | 'skipped' | 'failed'> {
  if (!cloudPushConfigured()) return 'skipped';
  if (!window.isSecureContext || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return 'failed';
  }
  if (Notification.permission !== 'granted') return 'failed';
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey()),
      });
    }
    const res = await fetch(pushApiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'subscribe', deviceId: pushDeviceId(), subscription: sub.toJSON() }),
    });
    return res.ok ? 'ok' : 'failed';
  } catch {
    return 'failed';
  }
}

export const LUMI_DAILY_ID = 'lumi-daily';

function nextLumiDailyFireAt(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  const target = new Date();
  target.setHours(Number.isFinite(hours) ? hours : 20, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  if (target.getTime() <= Date.now()) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime();
}

function lumiDailySlot(locale: Locale) {
  try {
    if (typeof localStorage === 'undefined') return null;
    if (localStorage.getItem('lumi-notifications-enabled') !== 'true') return null;
    if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') return null;
    const time = localStorage.getItem('lumi-notification-time') || '20:00';
    return {
      id: LUMI_DAILY_ID,
      kind: 'lumi-daily' as const,
      fireAt: nextLumiDailyFireAt(time),
      title: tLocale(locale, 'lumiDailyTitle'),
      body: tLocale(locale, 'lumiDailyBody'),
    };
  } catch {
    return null;
  }
}

export async function syncCloudReminders(tasks: Task[], locale: Locale = 'ru'): Promise<boolean> {
  if (!cloudPushConfigured()) return false;
  const dueNowIds: string[] = [];
  const reminders: Array<{
    id: string;
    kind?: 'task' | 'lumi-daily';
    fireAt: number;
    title: string;
    body: string;
  }> = [];

  for (const task of tasks) {
    const plan = cloudReminderFireAt(task);
    if (!plan) continue;
    if (plan.dueNow) dueNowIds.push(task.id);
    reminders.push({
      id: task.id,
      kind: 'task',
      fireAt: plan.fireAt,
      title: task.title.trim() || tLocale(locale, 'untitledTask'),
      body: reminderNoticeBody(locale),
    });
  }

  const lumi = lumiDailySlot(locale);
  if (lumi) reminders.push(lumi);

  try {
    const res = await fetch(pushApiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reminders', deviceId: pushDeviceId(), reminders }),
    });
    if (res.ok) markCloudDueNowSent(dueNowIds);
    return res.ok;
  } catch {
    return false;
  }
}

export async function refreshCloudReminders(locale: Locale = 'ru'): Promise<boolean> {
  const { getAllTasks } = await import('../db');
  return syncCloudReminders(await getAllTasks(), locale);
}
