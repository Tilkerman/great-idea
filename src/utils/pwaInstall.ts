import { tLocale } from '../i18n/catalog';
import type { Locale } from '../types';

export const TILI_PUBLIC_URL = 'https://tili.su/app/';

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
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

/** Built-in browser (Telegram, Instagram, …) — «На экран Домой» there does nothing useful. */
export function isIosInAppBrowser() {
  if (!isAppleMobile()) return false;
  const ua = navigator.userAgent;
  if (/Telegram|Instagram|FBAN|FBAV|Line\/|Twitter|GSA\/|WhatsApp|LinkedInApp|Snapchat/i.test(ua)) {
    return true;
  }
  const webkit = /AppleWebKit/i.test(ua);
  const safari = /Safari/i.test(ua);
  const notOtherIosBrowser = !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
  if (webkit && notOtherIosBrowser && !safari) return true;
  if (webkit && notOtherIosBrowser && safari && !/Version\/[\d.]+/i.test(ua)) return true;
  return false;
}

export function isIosChrome() {
  if (!isAppleMobile()) return false;
  return /CriOS/i.test(navigator.userAgent);
}

/** Real Mobile Safari tab (not Home Screen, not Chrome, not in-app). */
export function isIosSafariBrowser() {
  if (!isAppleMobile() || isStandaloneApp()) return false;
  if (isIosInAppBrowser() || isIosChrome()) return false;
  const ua = navigator.userAgent;
  return /Safari/i.test(ua) && /Version\/[\d.]+/i.test(ua);
}

/** Installed from iOS Home / iPad; needs home-indicator padding when env() is 0. */
export function isIosStandalonePwa() {
  if (!isStandaloneApp()) return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return isAppleMobile() || nav.standalone === true;
}

/** Installed Android WebAPK / shortcut; use env(safe-area) only, no iOS floor. */
export function isAndroidStandalonePwa() {
  if (!isStandaloneApp()) return false;
  if (isIosStandalonePwa()) return false;
  return /Android/i.test(navigator.userAgent);
}

/** iPhone X+ / recent iPad (notch or Dynamic Island). SE/8 are shorter. */
export function hasIosHomeIndicator() {
  if (typeof window === 'undefined') return false;
  return Math.max(window.screen.width, window.screen.height) >= 812;
}

/** 14 Pro / 15 / 16 family — Dynamic Island. 13 and non-Pro 14 stay on the notch floor. */
export function iosHasDynamicIsland() {
  if (typeof window === 'undefined') return false;
  return Math.max(window.screen.width, window.screen.height) >= 852;
}

/**
 * Floor safe-area-inset-top only in the installed iPhone PWA.
 * Safari already insets (or env() works). A floor there stacks on the status bar
 * and leaves a tall empty band above the header.
 */
export function iosNeedsTopSafeFloor() {
  if (typeof window === 'undefined') return false;
  if (!isAppleMobile() || !hasIosHomeIndicator()) return false;
  return isIosStandalonePwa();
}

export function applyPwaRootClasses(root: HTMLElement = document.documentElement) {
  const standalone = isStandaloneApp();
  const safeTop = iosNeedsTopSafeFloor();
  root.classList.toggle('is-standalone', standalone);
  root.classList.toggle('is-ios-standalone', isIosStandalonePwa());
  root.classList.toggle('is-android-standalone', isAndroidStandalonePwa());
  root.classList.toggle('ios-safe-top', safeTop);
  root.classList.toggle('ios-dynamic-island', safeTop && iosHasDynamicIsland());
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

export async function shareAppLink(locale: Locale = 'ru') {
  const url = getAppShareUrl();
  if (canWebShare()) {
    await navigator.share({
      title: 'TiLi Calendar',
      text: tLocale(locale, 'shareText'),
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
