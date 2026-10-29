/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null } | string>;
};

const SHELL_CACHE = 'tili-precache-shell-v1';
const MEDIA_CACHE = 'tili-app-assets-v4';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    await precacheShell();
    await self.skipWaiting();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => {
      if (key === SHELL_CACHE || key === MEDIA_CACHE) return undefined;
      if (key.startsWith('tili-precache-')) return undefined;
      if (key.startsWith('tili-app-assets-') && key !== MEDIA_CACHE) return caches.delete(key);
      return undefined;
    }));
    await self.clients.claim();
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    await Promise.all(windows.map(async (client) => {
      if (!client.url.startsWith(self.registration.scope)) return;
      try {
        await client.navigate(client.url);
      } catch {
        /* Safari may refuse — page reloads on controllerchange */
      }
    }));
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/v1/')) return;
  if (url.pathname.endsWith('/sw.js')) return;

  if (isHashedShellAsset(url.pathname)) {
    event.respondWith(cacheFirstHashed(event.request));
    return;
  }

  if (isAppDocument(event.request, url)) {
    event.respondWith(networkFirstDocument(event.request));
    return;
  }

  if (url.pathname.startsWith('/app/assets/') && isOfflineMediaAsset(url.pathname)) {
    event.respondWith(networkFirstMedia(event.request));
  }
});

function isHashedShellAsset(pathname: string) {
  return /\/app\/assets\/index-[A-Za-z0-9_-]+\.(js|css)$/.test(pathname)
    || /\/assets\/index-[A-Za-z0-9_-]+\.(js|css)$/.test(pathname);
}

function isAppDocument(request: Request, url: URL) {
  if (request.mode === 'navigate' && url.pathname.startsWith('/app')) return true;
  return url.pathname === '/app'
    || url.pathname === '/app/'
    || url.pathname === '/app/index.html';
}

function isOfflineMediaAsset(pathname: string) {
  return /\.(png|jpe?g|webp|gif|svg|woff2?|ico)$/i.test(pathname);
}

function shellIndexRequest() {
  return new Request(new URL('index.html', self.registration.scope).href, { cache: 'reload' });
}

function manifestUrls(): string[] {
  const manifest = self.__WB_MANIFEST;
  if (!Array.isArray(manifest)) return [];
  return manifest.map((entry) => {
    const url = typeof entry === 'string' ? entry : entry.url;
    return new URL(url, self.registration.scope).href;
  });
}

async function precacheShell() {
  const cache = await caches.open(SHELL_CACHE);
  const urls = new Set(manifestUrls());
  urls.add(new URL('index.html', self.registration.scope).href);
  urls.add(self.registration.scope);
  await Promise.all([...urls].map(async (url) => {
    try {
      const res = await fetch(url, { cache: 'reload' });
      if (res.ok) await cache.put(url, res.clone());
    } catch {
      /* one missing file must not block install */
    }
  }));
}

async function matchInPrecaches(request: Request) {
  const exact = await caches.match(request, { ignoreSearch: true });
  if (exact) return exact;
  const keys = await caches.keys();
  for (const key of keys) {
    if (!key.startsWith('tili-precache-') && key !== SHELL_CACHE) continue;
    const hit = await caches.open(key).then((cache) => cache.match(request, { ignoreSearch: true }));
    if (hit) return hit;
  }
  return undefined;
}

async function cacheFirstHashed(request: Request) {
  const cached = await matchInPrecaches(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res.ok) {
      const cache = await caches.open(SHELL_CACHE);
      void cache.put(request, res.clone());
    }
    return res;
  } catch {
    const fallback = await matchInPrecaches(request);
    if (fallback) return fallback;
    throw new Error('shell asset fetch failed');
  }
}

async function networkFirstDocument(request: Request) {
  try {
    const res = await fetch(request, { cache: 'no-store' });
    if (res.ok) {
      const cache = await caches.open(SHELL_CACHE);
      void cache.put(request, res.clone());
      void cache.put(shellIndexRequest(), res.clone());
      return res;
    }
    const cached = await matchInPrecaches(request)
      || await caches.match(shellIndexRequest(), { ignoreSearch: true });
    return cached ?? res;
  } catch {
    const cached = await matchInPrecaches(request)
      || await caches.match(shellIndexRequest(), { ignoreSearch: true });
    if (cached) return cached;
    throw new Error('app document fetch failed');
  }
}

async function networkFirstMedia(request: Request) {
  const cache = await caches.open(MEDIA_CACHE);
  try {
    const res = await fetch(request);
    if (res.ok) void cache.put(request, res.clone());
    return res;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error('asset fetch failed');
  }
}

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
