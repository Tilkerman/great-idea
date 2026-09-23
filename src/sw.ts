/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { tLocale } from './i18n/catalog';

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
void self.skipWaiting();
clientsClaim();

type PushPayload = {
  title?: string;
  body?: string;
  tag?: string;
  taskId?: string;
  open?: 'task' | 'lumi';
};

function taskIdFromTag(tag: string) {
  return tag.startsWith('task-') ? tag.slice(5) : '';
}

function isLumiOpen(data: PushPayload, tag: string) {
  return data.open === 'lumi' || tag === 'lumi-daily';
}

self.addEventListener('push', (event) => {
  let title = 'TiLi';
  let body = tLocale('ru', 'reminderFallback');
  let tag = 'tili-push';
  let taskId = '';
  let open: 'task' | 'lumi' = 'task';
  try {
    const data = event.data?.json() as PushPayload;
    if (data.title) title = data.title;
    if (data.body) body = data.body;
    if (data.tag) tag = data.tag;
    if (data.taskId) taskId = data.taskId;
    if (isLumiOpen(data, tag)) open = 'lumi';
  } catch {
    const text = event.data?.text();
    if (text) body = text;
  }
  if (open !== 'lumi' && !taskId) taskId = taskIdFromTag(tag);
  const icon = new URL('pwa-192.png', self.registration.scope).href;
  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon,
    tag,
    data: { taskId, open },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const payload = event.notification.data as { taskId?: string; open?: string } | undefined;
  const tag = event.notification.tag || '';
  const openLumi = payload?.open === 'lumi' || tag === 'lumi-daily';
  const taskId = openLumi
    ? ''
    : String(payload?.taskId || taskIdFromTag(tag));
  const url = openLumi
    ? `${self.registration.scope}?lumi=1`
    : taskId
      ? `${self.registration.scope}?task=${encodeURIComponent(taskId)}`
      : self.registration.scope;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows[0];
    if (existing) {
      await existing.focus();
      if (openLumi) {
        if ('navigate' in existing) {
          await (existing as WindowClient).navigate(url);
          return;
        }
        existing.postMessage({ type: 'tili-open-lumi' });
        return;
      }
      if (taskId && 'navigate' in existing) {
        await (existing as WindowClient).navigate(url);
        return;
      }
      if (taskId) existing.postMessage({ type: 'tili-open-task', taskId });
      return;
    }
    await self.clients.openWindow(url);
  })());
});
