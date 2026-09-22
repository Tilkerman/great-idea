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
};

function taskIdFromTag(tag: string) {
  return tag.startsWith('task-') ? tag.slice(5) : '';
}

self.addEventListener('push', (event) => {
  let title = 'TiLi';
  let body = tLocale('ru', 'reminderFallback');
  let tag = 'tili-push';
  let taskId = '';
  try {
    const data = event.data?.json() as PushPayload;
    if (data.title) title = data.title;
    if (data.body) body = data.body;
    if (data.tag) tag = data.tag;
    if (data.taskId) taskId = data.taskId;
  } catch {
    const text = event.data?.text();
    if (text) body = text;
  }
  if (!taskId) taskId = taskIdFromTag(tag);
  const icon = new URL('pwa-192.png', self.registration.scope).href;
  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon,
    tag,
    data: { taskId },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const taskId = String((event.notification.data as { taskId?: string } | undefined)?.taskId
    || taskIdFromTag(event.notification.tag || ''));
  const url = taskId
    ? `${self.registration.scope}?task=${encodeURIComponent(taskId)}`
    : self.registration.scope;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows[0];
    if (existing) {
      await existing.focus();
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
