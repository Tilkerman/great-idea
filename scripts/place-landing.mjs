/**
 * Vite writes the PWA into dist/app (base /app/).
 * The domain root should be the landing page.
 */
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const appDir = path.join(dist, 'app');

if (!fs.existsSync(path.join(appDir, 'index.html'))) {
  console.warn('place-landing: no dist/app/index.html, skip');
  process.exit(0);
}

const files = [
  'landing.html',
  'landing.css',
  'landing-i18n.js',
  'landing-analytics.js',
  'logo-tili-lumi.png',
  'logo-tili-header.png',
  'favicon.png',
  'apple-touch-icon.png',
  'icon-tili-512.png',
  'privacy.html',
  'sitemap.xml',
  'robots.txt',
  'CNAME',
];

for (const name of files) {
  const from = path.join(appDir, name);
  if (!fs.existsSync(from)) continue;
  fs.copyFileSync(from, path.join(dist, name));
}

const screensFrom = path.join(appDir, 'screens');
if (fs.existsSync(screensFrom)) {
  fs.cpSync(screensFrom, path.join(dist, 'screens'), { recursive: true });
}

fs.copyFileSync(path.join(dist, 'landing.html'), path.join(dist, 'index.html'));
fs.writeFileSync(path.join(dist, '.nojekyll'), '');

// Drop the previous root service worker so an already-installed visit
// updates once, clears the cached app shell, and leaves the landing.
fs.writeFileSync(
  path.join(dist, 'sw.js'),
  `self.addEventListener('install', (event) => {
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
`,
);

for (const stale of ['registerSW.js', 'manifest.webmanifest']) {
  const file = path.join(dist, stale);
  if (fs.existsSync(file)) fs.rmSync(file);
}
const rootAssets = path.join(dist, 'assets');
if (fs.existsSync(rootAssets)) fs.rmSync(rootAssets, { recursive: true });

console.log('place-landing: tili.su/ is the landing, app is /app/');
