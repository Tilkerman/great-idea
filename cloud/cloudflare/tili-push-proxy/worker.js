/**
 * Cloudflare Worker for tili.su:
 * 1) /v1/push* → api.tili.su (push API)
 * 2) /app* → fresh files from gh-pages (bypasses stuck GitHub Pages CDN)
 *
 * GitHub Pages custom-domain builds can stall after Cloudflare DNS changes;
 * raw.githubusercontent stays current.
 */

const PUSH_HOST = 'api.tili.su';
const APP_RAW =
  'https://raw.githubusercontent.com/Tilkerman/great-idea/gh-pages';

function contentTypeFor(path) {
  if (path.endsWith('.html')) return 'text/html; charset=utf-8';
  if (path.endsWith('.js') || path.endsWith('.mjs')) {
    return 'application/javascript; charset=utf-8';
  }
  if (path.endsWith('.css')) return 'text/css; charset=utf-8';
  if (path.endsWith('.webmanifest') || path.endsWith('.json')) {
    return 'application/manifest+json; charset=utf-8';
  }
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.svg')) return 'image/svg+xml';
  if (path.endsWith('.ico')) return 'image/x-icon';
  if (path.endsWith('.woff2')) return 'font/woff2';
  if (path.endsWith('.map')) return 'application/json';
  return 'application/octet-stream';
}

async function proxyPush(request, url) {
  const upstream = new URL(request.url);
  upstream.hostname = PUSH_HOST;
  upstream.protocol = 'https:';
  const headers = new Headers(request.headers);
  headers.set('Host', PUSH_HOST);
  return fetch(
    new Request(upstream, {
      method: request.method,
      headers,
      body:
        request.method !== 'GET' && request.method !== 'HEAD'
          ? request.body
          : undefined,
      redirect: 'follow',
    }),
  );
}

async function proxyApp(url) {
  let path = url.pathname;
  if (path === '/app' || path === '/app/') path = '/app/index.html';
  // Bust GitHub/CDN caches for HTML so iPhone Home gets the latest shell.
  const bust = path.endsWith('.html') || path.endsWith('sw.js')
    ? `?t=${Date.now()}`
    : '';
  const upstream = `${APP_RAW}${path}${bust}`;
  const res = await fetch(upstream);
  if (!res.ok) {
    return new Response(`Upstream ${res.status} for ${path}`, {
      status: res.status,
    });
  }
  const headers = new Headers();
  headers.set('Content-Type', contentTypeFor(path));
  if (path.endsWith('.html') || path.endsWith('sw.js')) {
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    headers.set('Pragma', 'no-cache');
  } else {
    headers.set('Cache-Control', 'public, max-age=120');
  }
  headers.set('Access-Control-Allow-Origin', '*');
  return new Response(res.body, { status: 200, headers });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/v1/push')) {
      return proxyPush(request, url);
    }
    if (url.pathname === '/app' || url.pathname.startsWith('/app/')) {
      return proxyApp(url);
    }
    return new Response('Not found', { status: 404 });
  },
};
