import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import type { Locale } from '../../types';
import { en, type TranslationKey } from './en';
import { ru } from './ru';

export type { Locale };

type TranslateVars = Record<string, string | number>;

function interpolate(template: string, vars?: TranslateVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = vars[key];
    return value === undefined || value === null ? `{${key}}` : String(value);
  });
}

function dictLocale(locale: Locale): 'ru' | 'en' {
  return locale === 'ru' ? 'ru' : 'en';
}

function getDict(locale: Locale) {
  return dictLocale(locale) === 'ru' ? ru : en;
}

function getRussianNounForm(count: number): 'one' | 'few' | 'many' | 'other' {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'one';
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return 'few';
  if (mod10 === 0 || (mod10 >= 5 && mod10 <= 9) || (mod100 >= 11 && mod100 <= 14)) return 'many';
  return 'other';
}

export function getWishNoun(count: number, locale: Locale): string {
  if (locale === 'ru') {
    const form = getRussianNounForm(count);
    return ru[`desires.noun.${form}` as TranslationKey];
  }
  return count === 1 ? en['desires.noun.one'] : en['desires.noun.other'];
}

type I18nContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: TranslationKey, vars?: TranslateVars) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  children,
  locale,
  onLocaleChange,
}: {
  children: ReactNode;
  locale: Locale;
  onLocaleChange: (next: Locale) => void;
}) {
  const t = useCallback(
    (key: TranslationKey, vars?: TranslateVars) => {
      const dict = getDict(locale);
      const template = dict[key] ?? en[key];
      return interpolate(template, vars);
    },
    [locale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale: onLocaleChange, t }),
    [locale, onLocaleChange, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
