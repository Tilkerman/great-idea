export const TILI_PUBLIC_URL = 'https://tilkerman.github.io/great-idea/';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function isStandaloneApp() {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

export function isAppleMobile() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

export function canWebShare() {
  return typeof navigator.share === 'function';
}

export function getAppShareUrl() {
  if (import.meta.env.PROD) return TILI_PUBLIC_URL;
  const base = import.meta.env.BASE_URL ?? '/';
  return `${window.location.origin}${base}`;
}

export async function copyAppLink() {
  const url = getAppShareUrl();
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
    return url;
  }
  const ta = document.createElement('textarea');
  ta.value = url;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  return url;
}

export async function shareAppLink() {
  const url = getAppShareUrl();
  if (canWebShare()) {
    await navigator.share({
      title: 'TiLi Calendar',
      text: 'Календарь TiLi на телефон — PWA, работает офлайн',
      url,
    });
    return 'shared' as const;
  }
  await copyAppLink();
  return 'copied' as const;
}

/** Анонимный счётчик интереса к установке (без данных пользователя). */
export function trackInstallButtonClick() {
  if (typeof window === 'undefined') return;

  const payload = {
    event: 'install_button_click',
    ts: Date.now(),
    platform: isAppleMobile() ? 'ios' : 'android',
    standalone: isStandaloneApp(),
  };

  const customUrl = import.meta.env.VITE_INSTALL_TRACKING_URL as string | undefined;
  if (customUrl) {
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    navigator.sendBeacon?.(customUrl, blob);
  }

  const ns = 'tili-great-idea';
  const key = import.meta.env.PROD ? 'install-button' : 'install-button-dev';
  void fetch(`https://api.countapi.xyz/hit/${ns}/${key}`, {
    method: 'GET',
    mode: 'no-cors',
    keepalive: true,
  }).catch(() => {});
}

/** Для проверки: GET https://api.countapi.xyz/get/tili-great-idea/install-button */
export const INSTALL_CLICK_COUNTER_GET_URL =
  'https://api.countapi.xyz/get/tili-great-idea/install-button';
