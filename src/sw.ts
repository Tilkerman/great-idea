/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
void self.skipWaiting();
clientsClaim();

type PushPayload = {
  title?: string;
  body?: string;
  tag?: string;
};

self.addEventListener('push', (event) => {
  let title = 'TiLi';
  let body = 'Напоминание';
  let tag = 'tili-push';
  try {
    const data = event.data?.json() as PushPayload;
    if (data.title) title = data.title;
    if (data.body) body = data.body;
    if (data.tag) tag = data.tag;
  } catch {
    const text = event.data?.text();
    if (text) body = text;
  }
  const icon = new URL('pwa-192.png', self.registration.scope).href;
  event.waitUntil(self.registration.showNotification(title, { body, icon, tag }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = self.registration.scope;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const existing = windows[0];
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    }),
  );
});
