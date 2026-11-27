/** Same counter as the landing page. App: visits only, no Webvisor. */
export const APP_METRIKA_ID = 113253680;

type YmFn = ((...args: unknown[]) => void) & { a?: IArguments[]; l?: number };

let started = false;

function ymQueue(): YmFn {
  const w = window as Window & { ym?: YmFn };
  if (!w.ym) {
    const fn: YmFn = function (this: YmFn) {
      (fn.a = fn.a || []).push(arguments);
    };
    w.ym = fn;
  }
  return w.ym;
}

/** Load Yandex Metrica for /app/ once. No screen recording, no click map. */
export function startAppMetrika(settingsEnabled: boolean): void {
  if (!settingsEnabled || started || typeof window === 'undefined') return;
  started = true;

  const ym = ymQueue();
  ym.l = Date.now();
  ym(APP_METRIKA_ID, 'init', {
    ssr: true,
    webvisor: false,
    clickmap: false,
    accurateTrackBounce: true,
    trackLinks: false,
    referrer: document.referrer,
    url: location.href,
  });

  const src = `https://mc.yandex.ru/metrika/tag.js?id=${APP_METRIKA_ID}`;
  if (document.querySelector(`script[src="${src}"]`)) return;

  const el = document.createElement('script');
  el.async = true;
  el.src = src;
  const first = document.getElementsByTagName('script')[0];
  first?.parentNode?.insertBefore(el, first);
}
