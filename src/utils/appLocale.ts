import type { Locale } from '../types';

const LOCALE_CHOSEN_KEY = 'tili-locale-initialized';

let runtime: Locale = 'ru';

export function parseAppLocale(value: unknown): Locale | null {
  const tag = String(value ?? '').trim().toLowerCase().slice(0, 2);
  if (tag === 'ru' || tag === 'en' || tag === 'es') return tag;
  return null;
}

export function setRuntimeLocale(locale: Locale) {
  runtime = parseAppLocale(locale) ?? 'ru';
}

export function runtimeLocale(): Locale {
  return runtime;
}

export function acceptLanguageForLocale(locale: Locale): string {
  if (locale === 'en') return 'en-US,en;q=0.9';
  if (locale === 'es') return 'es,es-ES;q=0.9,en;q=0.8';
  return 'ru-RU,ru;q=0.9';
}

export function localeFromSearch(search: string): Locale | null {
  try {
    const query = search.startsWith('?') ? search.slice(1) : search;
    return parseAppLocale(new URLSearchParams(query).get('lang'));
  } catch {
    return null;
  }
}

export function localeFromNavigatorLanguage(language: string | undefined | null): Locale | null {
  const tag = String(language ?? '').trim().toLowerCase();
  if (tag.startsWith('ru')) return 'ru';
  if (tag.startsWith('es')) return 'es';
  if (tag.startsWith('en')) return 'en';
  return null;
}

/**
 * URL ?lang= always wins (ads / shared links).
 * After the user (or first-launch detect) picked a language, keep it —
 * do not overwrite Russian with the OS language on every open.
 * First visit with factory Russian: follow the browser if it is ru/en/es.
 */
export function resolveLaunchLocale(input: {
  stored: Locale;
  localeChosen: boolean;
  search: string;
  navigatorLanguage?: string | null;
}): Locale {
  const fromUrl = localeFromSearch(input.search);
  if (fromUrl) return fromUrl;
  const stored = parseAppLocale(input.stored) ?? 'ru';
  if (input.localeChosen || stored !== 'ru') return stored;
  return localeFromNavigatorLanguage(input.navigatorLanguage) ?? stored;
}

export function readLocaleChosenFlag(): boolean {
  try {
    return localStorage.getItem(LOCALE_CHOSEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function markLocaleChosen(): void {
  try {
    localStorage.setItem(LOCALE_CHOSEN_KEY, '1');
  } catch {
    /* private mode */
  }
}
