import { isUnscheduledTask } from './hourSlot';
import { newTaskId } from './id';
import type { Task } from '../types';

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

export async function syncCloudReminders(
  tasks: Task[],
  reminderBeforeMin: number,
): Promise<boolean> {
  if (!cloudPushConfigured()) return false;
  const now = Date.now();
  const reminders = tasks
    .filter((task) => task.status !== 'completed' && !isUnscheduledTask(task))
    .map((task) => {
      const mins = task.reminderOffsetMinutes ?? reminderBeforeMin;
      if (mins < 0) return null;
      const fireAt = new Date(task.startAt).getTime() - mins * 60_000;
      if (fireAt <= now) return null;
      const when = new Date(task.startAt);
      const hh = String(when.getHours()).padStart(2, '0');
      const mm = String(when.getMinutes()).padStart(2, '0');
      return {
        id: task.id,
        fireAt,
        title: task.title.trim() || 'Дело в календаре',
        body: `Начало в ${hh}:${mm}`,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  try {
    const res = await fetch(pushApiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reminders', deviceId: pushDeviceId(), reminders }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
