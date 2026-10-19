/**
 * tili.su Worker:
 * - /v1/push* → api.tili.su
 * - /app* → jsDelivr gh-pages (GitHub Pages custom-domain CDN is stuck)
 *
 * raw.githubusercontent.com is often blocked from Workers (throws 1101).
 * jsDelivr works; purge after each deploy: purge.jsdelivr.net/gh/...
 */

const PUSH_HOST = 'api.tili.su';

/** Pin to deploy commit (wrangler [vars] APP_BUILD) so index and hashed assets stay in sync. */
function appCdnBase(env) {
  const ref = env?.APP_BUILD || 'gh-pages';
  return `https://cdn.jsdelivr.net/gh/Tilkerman/great-idea@${ref}`;
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
        const upstream = `${appCdnBase(env)}${path}`;
        const res = await fetch(upstream, {
          cf: { cacheTtl: 0, cacheEverything: false },
        });
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
