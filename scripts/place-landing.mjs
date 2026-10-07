/**
 * Vite writes the PWA into dist/app (base /app/).
 * The domain root should be the landing page.
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const root = process.cwd();
const dist = path.join(root, 'dist');
const appDir = path.join(dist, 'app');

function landingBuildId() {
  if (process.env.VITE_APP_BUILD) return process.env.VITE_APP_BUILD;
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return String(Date.now());
  }
}

function cacheBustLandingHtml(html, buildId) {
  const q = (file) => `"./${file}?v=${buildId}"`;
  return html
    .replace(/"\.\/landing\.css(?:\?[^"]*)?"/g, q('landing.css'))
    .replace(/"\.\/landing-analytics\.js(?:\?[^"]*)?"/g, q('landing-analytics.js'))
    .replace(/"\.\/landing-i18n\.js(?:\?[^"]*)?"/g, q('landing-i18n.js'))
    .replace(/"\.\/landing\/lumi-mascot\.png(?:\?[^"]*)?"/g, `"./landing/lumi-mascot.png?v=${buildId}"`)
    .replace(/"\.\/landing\/lumi-mascot-up\.png(?:\?[^"]*)?"/g, `"./landing/lumi-mascot-up.png?v=${buildId}"`)
    .replace(/"\.\/landing\/tili-hero-phones\.png(?:\?[^"]*)?"/g, `"./landing/tili-hero-phones.png?v=${buildId}"`)
    .replace(/"\.\/logo-tili-lumi-lockup\.png(?:\?[^"]*)?"/g, `"./logo-tili-lumi-lockup.png?v=${buildId}"`);
}

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
  'logo-tili-lumi-lockup.png',
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

const landingAssets = path.join(appDir, 'landing');
if (fs.existsSync(landingAssets)) {
  fs.cpSync(landingAssets, path.join(dist, 'landing'), { recursive: true });
}

fs.copyFileSync(path.join(dist, 'landing.html'), path.join(dist, 'index.html'));
const buildId = landingBuildId();
for (const name of ['index.html', 'landing.html']) {
  const file = path.join(dist, name);
  if (!fs.existsSync(file)) continue;
  const html = cacheBustLandingHtml(fs.readFileSync(file, 'utf8'), buildId);
  fs.writeFileSync(file, html);
}
console.log(`place-landing: cache bust v=${buildId}`);
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
