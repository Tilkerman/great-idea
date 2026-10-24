/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
});
const ASSET_CACHE = 'tili-app-assets-v4';

/** JS/CSS всегда с сети — иначе на Mac после обновления ловили «голый» календарь без стилей. */
function isOfflineMediaAsset(pathname: string) {
  return /\.(png|jpe?g|webp|gif|svg|woff2?|ico)$/i.test(pathname);
}

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('tili-app-assets-') && k !== ASSET_CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
    // Dock / «На экран Домой» держит старое окно. Браузерная вкладка открывается заново и видит деплой.
    // При активации нового SW сами переходим на свежий index (один раз: повторной активации без смены sw.js нет).
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    await Promise.all(windows.map(async (client) => {
      if (!client.url.startsWith(self.registration.scope)) return;
      try {
        await client.navigate(client.url);
      } catch {
        /* Safari может отказать — страница перезагрузится по controllerchange */
      }
    }));
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (!url.pathname.startsWith('/app/assets/')) return;
  if (!isOfflineMediaAsset(url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(ASSET_CACHE);
    try {
      const res = await fetch(event.request);
      if (res.ok) {
        void cache.put(event.request, res.clone());
      }
      return res;
    } catch {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      throw new Error('asset fetch failed');
    }
  })());
});

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

self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let title = 'TiLi';
    let body = 'Напоминание';
    let tag = 'tili-push';
    let taskId = '';
    let open: 'task' | 'lumi' = 'task';
    try {
      const data = (event.data ? event.data.json() : {}) as PushPayload;
      if (data.title) title = data.title;
      if (data.body) body = data.body;
      if (data.tag) tag = data.tag;
      if (data.taskId) taskId = data.taskId;
      if (data.open === 'lumi' || tag === 'lumi-daily') open = 'lumi';
    } catch {
      const text = event.data?.text();
      if (text) body = text;
    }
    if (open !== 'lumi' && !taskId) taskId = taskIdFromTag(tag);
    try {
      await self.registration.showNotification(title, {
        body,
        tag,
        renotify: true,
        data: { taskId, open },
      });
    } catch {
      await self.registration.showNotification(title, { body });
    }
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const payload = event.notification.data as { taskId?: string; open?: string } | undefined;
  const tag = event.notification.tag || '';
  const openLumi = payload?.open === 'lumi' || tag === 'lumi-daily';
  const taskId = openLumi ? '' : String(payload?.taskId || taskIdFromTag(tag));
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
      if ('navigate' in existing) {
        await (existing as WindowClient).navigate(url);
        return;
      }
      existing.postMessage(openLumi ? { type: 'tili-open-lumi' } : { type: 'tili-open-task', taskId });
      return;
    }
    await self.clients.openWindow(url);
  })());
});

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      client.postMessage({ type: 'tili-push-resubscribe' });
    }
  })());
});
