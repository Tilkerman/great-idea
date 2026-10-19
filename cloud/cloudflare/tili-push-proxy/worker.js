/**
 * tili.su Worker:
 * - /v1/push* → api.tili.su
 * - /app* → jsDelivr @APP_BUILD (gh-pages commit), fallback @gh-pages
 *
 * GitHub Pages custom-domain CDN can lag; jsDelivr + purge after each deploy.
 * raw.githubusercontent.com often fails from Workers (1101).
 */

const PUSH_HOST = 'api.tili.su';
const GH_REPO = 'Tilkerman/great-idea';

function jsdelivrUrl(ref, path) {
  return `https://cdn.jsdelivr.net/gh/${GH_REPO}@${ref}${path}`;
}

function upstreamUrls(path, env) {
  const pin = env?.APP_BUILD?.trim();
  const urls = [];
  if (pin && pin !== 'gh-pages') urls.push(jsdelivrUrl(pin, path));
  urls.push(jsdelivrUrl('gh-pages', path));
  return urls;
}

async function fetchAppPath(path, env) {
  for (const upstream of upstreamUrls(path, env)) {
    const res = await fetch(upstream, {
      cf: { cacheTtl: 0, cacheEverything: false },
    });
    if (res.ok) return res;
  }
  return null;
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

        // No redirect on /app/ — iOS «На экран Домой» validates manifest start_url (must be 200).
        const res = await fetchAppPath(path, env);
        if (!res) {
          return new Response(`Upstream 404: ${path}`, { status: 502 });
        }

        const isShell = path.endsWith('.html') || path.endsWith('sw.js');
        const headers = new Headers();
        headers.set('Content-Type', contentTypeFor(path));
        headers.set(
          'Cache-Control',
          isShell ? 'no-store, must-revalidate' : 'public, max-age=31536000, immutable',
        );
        if (isShell) {
          headers.set('CDN-Cache-Control', 'no-store');
          headers.set('Cloudflare-CDN-Cache-Control', 'no-store');
        }
        return new Response(res.body, { status: 200, headers });
      }

      return new Response('Not found', { status: 404 });
    } catch (err) {
      return new Response(`Worker error: ${String(err)}`, { status: 500 });
    }
  },
};
