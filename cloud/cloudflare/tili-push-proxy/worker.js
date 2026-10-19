/**
 * tili.su Worker:
 * - /v1/push* → api.tili.su
 * - /app* → jsDelivr gh-pages (GitHub Pages custom-domain CDN is stuck)
 *
 * raw.githubusercontent.com is often blocked from Workers (throws 1101).
 * jsDelivr works; purge after each deploy: purge.jsdelivr.net/gh/...
 */

const PUSH_HOST = 'api.tili.su';
const APP_CDN = 'https://cdn.jsdelivr.net/gh/Tilkerman/great-idea@gh-pages';

/** Bust jsDelivr/edge cache for shell files (set via wrangler.toml [vars] on deploy). */
function appUpstreamUrl(path, env) {
  const base = `${APP_CDN}${path}`;
  const bust = env?.APP_BUILD;
  if (!bust) return base;
  if (path.endsWith('.html') || path.endsWith('sw.js') || path.endsWith('sw.mjs')) {
    return `${base}?v=${encodeURIComponent(bust)}`;
  }
  return base;
}

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
  return 'application/octet-stream';
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      if (url.pathname.startsWith('/v1/push')) {
        const upstream = new URL(request.url);
        upstream.hostname = PUSH_HOST;
        upstream.protocol = 'https:';
        const headers = new Headers(request.headers);
        headers.set('Host', PUSH_HOST);
        return fetch(
          new Request(upstream.toString(), {
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

      if (url.pathname === '/app' || url.pathname.startsWith('/app/')) {
        let path = url.pathname;
        if (path === '/app' || path === '/app/') path = '/app/index.html';
        const upstream = `${APP_CDN}${path}`;
        const res = await fetch(upstream);
        if (!res.ok) {
          return new Response(`Upstream ${res.status}: ${path}`, {
            status: res.status,
          });
        }
        const headers = new Headers();
        headers.set('Content-Type', contentTypeFor(path));
        headers.set(
          'Cache-Control',
          path.endsWith('.html') || path.endsWith('sw.js')
            ? 'no-store, must-revalidate'
            : 'public, max-age=120',
        );
        headers.set('CDN-Cache-Control', 'no-store');
        headers.set('Cloudflare-CDN-Cache-Control', 'no-store');
        return new Response(res.body, { status: 200, headers });
      }

      return new Response('Not found', { status: 404 });
    } catch (err) {
      return new Response(`Worker error: ${String(err)}`, { status: 500 });
    }
  },
};
