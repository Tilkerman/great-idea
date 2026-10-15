import { newTaskId } from './id';
import { reminderNoticeBody } from './notifications';
import { tLocale } from '../i18n/catalog';
import { isStandaloneApp } from './pwaInstall';
import { cloudReminderFireAt, markCloudDueNowSent } from './reminderTime';
import type { Locale, Task } from '../types';

const DEVICE_KEY = 'tili-push-device';

function vapidPublicKey() {
  return import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim() ?? '';
}

function pushApiUrl() {
  const fromEnv = import.meta.env.VITE_PUSH_API_URL?.trim().replace(/\/$/, '') ?? '';
  if (fromEnv) return fromEnv;
  return import.meta.env.PROD ? 'https://tili.su/v1/push' : '';
}

function pushApiUrls() {
  const urls: string[] = [];
  const push = (url: string) => {
    const clean = url.replace(/\/$/, '');
    if (clean && !urls.includes(clean)) urls.push(clean);
  };
  if (import.meta.env.PROD && typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'tili.su' || host === 'www.tili.su') {
      push(`${window.location.origin}/v1/push`);
    }
  }
  push(pushApiUrl());
  if (import.meta.env.PROD) push('https://api.tili.su/v1/push');
  push(
    import.meta.env.VITE_PUSH_API_FALLBACK_URL?.trim()
    || (import.meta.env.PROD ? 'https://functions.yandexcloud.net/d4eps3rpvttu70fnqs21' : ''),
  );
  return urls;
}

export function cloudPushConfigured() {
  return Boolean(vapidPublicKey() && pushApiUrls().length);
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

async function postOnePush(url: string, body: Record<string, unknown>, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
      keepalive: true,
    });
  } finally {
    window.clearTimeout(timer);
  }
}

async function postPushJson(body: Record<string, unknown>, ms = 8000): Promise<Response> {
  const urls = pushApiUrls();
  if (urls.length === 0) throw new Error('no-push-api');
  const settled = await Promise.allSettled(urls.map((url) => postOnePush(url, body, ms)));
  const ok = settled.find((row) => row.status === 'fulfilled' && row.value.ok);
  if (ok && ok.status === 'fulfilled') return ok.value;
  const any = settled.find((row) => row.status === 'fulfilled');
  if (any && any.status === 'fulfilled') return any.value;
  throw new Error('network');
}

async function postSubscription(sub: PushSubscription): Promise<boolean> {
  const res = await postPushJson({
    action: 'subscribe',
    deviceId: pushDeviceId(),
    subscription: sub.toJSON(),
  });
  return res.ok;
}

function appSwUrl() {
  const base = import.meta.env.BASE_URL || '/';
  return { base, url: `${base}sw.js` };
}

async function pushRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  const { base, url } = appSwUrl();
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.map((reg) => {
    if (reg.scope.includes('/app')) return Promise.resolve();
    return reg.unregister().catch(() => false);
  }));
  const reg = await navigator.serviceWorker.register(url, { scope: base });
  if (reg.active) return reg;
  try {
    return await navigator.serviceWorker.ready;
  } catch {
    return (await navigator.serviceWorker.getRegistration(base)) ?? reg;
  }
}

export async function pingPushHello(): Promise<boolean> {
  if (!cloudPushConfigured()) return false;
  try {
    const res = await postPushJson({
      action: 'hello',
      deviceId: pushDeviceId(),
      standalone: isStandaloneApp(),
      ua: navigator.userAgent.slice(0, 120),
      from: 'app',
    }, 5000);
    return res.ok;
  } catch {
    return false;
  }
}

export type PushDiagnostics = {
  deviceId: string;
  standalone: boolean;
  secure: boolean;
  permission: string;
  swScope: string | null;
  swScript: string | null;
  hasPushManager: boolean;
  apiSameSite: 'ok' | 'fail' | 'skip';
  apiPrimary: 'ok' | 'fail' | 'skip';
  apiFallback: 'ok' | 'fail' | 'skip';
  subscribe: SubscribePushResult | 'skip';
};

async function pingEndpoint(url: string): Promise<boolean> {
  try {
    const res = await postOnePush(url, {
      action: 'hello',
      deviceId: pushDeviceId(),
      standalone: isStandaloneApp(),
      ua: navigator.userAgent.slice(0, 120),
      from: 'diag',
    }, 7000);
    return res.ok;
  } catch {
    return false;
  }
}

/** Для iPhone: показать, дошёл ли телефон до сервера и есть ли push. */
export async function runPushDiagnostics(): Promise<PushDiagnostics> {
  const urls = pushApiUrls();
  const sameSite = urls.find((u) => u.startsWith('/') || u.includes('tili.su/v1/push')) ?? '';
  const primary = urls.find((u) => u.includes('api.tili.su')) ?? '';
  const fallback = urls.find((u) => u.includes('yandexcloud')) ?? '';
  let swScope: string | null = null;
  let swScript: string | null = null;
  let hasPushManager = false;
  if ('serviceWorker' in navigator) {
    try {
      const reg = await pushRegistration();
      swScope = reg?.scope ?? null;
      swScript = reg?.active?.scriptURL ?? reg?.installing?.scriptURL ?? null;
      hasPushManager = Boolean(reg?.pushManager);
    } catch {
      /* ignore */
    }
  }
  const permission = typeof Notification === 'undefined'
    ? 'unsupported'
    : Notification.permission;
  let subscribe: SubscribePushResult | 'skip' = 'skip';
  if (permission === 'granted' && cloudPushConfigured()) {
    subscribe = await subscribeTiliPush();
  }
  return {
    deviceId: pushDeviceId(),
    standalone: isStandaloneApp(),
    secure: window.isSecureContext,
    permission,
    swScope,
    swScript,
    hasPushManager,
    apiSameSite: sameSite ? (await pingEndpoint(sameSite) ? 'ok' : 'fail') : 'skip',
    apiPrimary: primary ? (await pingEndpoint(primary) ? 'ok' : 'fail') : 'skip',
    apiFallback: fallback ? (await pingEndpoint(fallback) ? 'ok' : 'fail') : 'skip',
    subscribe,
  };
}

export type SubscribePushResult = 'ok' | 'skipped' | 'no-sw' | 'no-push' | 'no-perm' | 'network' | 'failed';

export async function sendTestPush(): Promise<boolean> {
  if (!cloudPushConfigured()) return false;
  try {
    const subscribed = await subscribeTiliPush();
    if (subscribed !== 'ok') return false;
    const res = await postPushJson({ action: 'test', deviceId: pushDeviceId() }, 8000);
    if (!res.ok) return false;
    const payload = (await res.json()) as { ok?: boolean };
    return Boolean(payload.ok);
  } catch {
    return false;
  }
}

export async function subscribeTiliPush(): Promise<SubscribePushResult> {
  void pingPushHello();
  if (!cloudPushConfigured()) return 'skipped';
  if (!window.isSecureContext || !('serviceWorker' in navigator)) return 'no-sw';
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return 'no-perm';
  try {
    const reg = await pushRegistration();
    // iPhone: PushManager often exists only on the worker, not on window.
    if (!reg?.pushManager) return 'no-push';
    const key = urlBase64ToUint8Array(vapidPublicKey());
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key,
      });
    }
    try {
      return (await postSubscription(sub)) ? 'ok' : 'network';
    } catch {
      return 'network';
    }
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
    const res = await postPushJson({
      action: 'reminders',
      deviceId: pushDeviceId(),
      reminders,
      replace: true,
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
