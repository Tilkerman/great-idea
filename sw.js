self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
    const clients = await self.clients.matchAll({ type: 'window' });
    await Promise.all(clients.map((client) => {
      const url = new URL(client.url);
      if (url.pathname.startsWith('/app')) return undefined;
      return client.navigate(client.url);
    }));
    await self.registration.unregister();
  })());
});
