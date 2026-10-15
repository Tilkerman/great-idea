/**
 * Cloudflare Worker: https://tili.su/v1/push* → https://api.tili.su/v1/push*
 * iPhone PWA calls same-origin /v1/push (no CORS, often works when api.tili.su is blocked).
 */
export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/v1/push')) {
      return new Response('Not found', { status: 404 });
    }
    const upstream = new URL(request.url);
    upstream.hostname = 'api.tili.su';
    upstream.protocol = 'https:';
    const headers = new Headers(request.headers);
    headers.set('Host', 'api.tili.su');
    return fetch(
      new Request(upstream, {
        method: request.method,
        headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
        redirect: 'follow',
      }),
    );
  },
};
