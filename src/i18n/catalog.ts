import type { Locale } from '../types';
import { en } from './en';
import { es } from './es';
import { ru } from './ru';

export type Catalog = typeof ru;
export type MsgKey = keyof Catalog['msg'];

const packs = { ru, en, es } as const;

export function getPack(locale: Locale) {
  return packs[locale] ?? packs.ru;
}

export function dateTag(locale: Locale) {
  if (locale === 'en') return 'en-US';
  if (locale === 'es') return 'es';
  return 'ru-RU';
}

export function interpolate(template: string, vars?: Record<string, string | number>) {
  if (typeof template !== 'string') return '';
  if (!vars) return template;
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{${key}}`, String(value));
  }
  return out;
}

export function tLocale(locale: Locale, key: MsgKey, vars?: Record<string, string | number>) {
  return interpolate(getPack(locale).msg[key], vars);
}
