import { newTaskId } from './id';
import { isStandaloneApp } from './pwaInstall';
import type { Locale, TaskCategory } from '../types';

const CONSENT_KEY = 'tili-analytics-consent';
const DISTINCT_ID_KEY = 'tili-analytics-id';
const UTM_KEY = 'tili-attribution-utm';
const SESSION_OPEN_KEY = 'tili-analytics-app-open';
const FIRST_TASK_KEY = 'tili-analytics-first-task';
const PUSH_ENABLED_KEY = 'tili-analytics-push-enabled';

export type AnalyticsConsent = 'yes' | 'no' | null;

export function getAnalyticsConsent(): AnalyticsConsent {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    if (v === 'yes' || v === 'no') return v;
    return null;
  } catch {
    return null;
  }
}

export function setAnalyticsConsent(allowed: boolean): void {
  try {
    localStorage.setItem(CONSENT_KEY, allowed ? 'yes' : 'no');
  } catch {
    /* ignore */
  }
}

export function analyticsAllowed(settingsEnabled: boolean): boolean {
  return settingsEnabled;
}

export function getAnalyticsDistinctId(): string {
  try {
    const existing = localStorage.getItem(DISTINCT_ID_KEY);
    if (existing) return existing;
    const id = newTaskId();
    localStorage.setItem(DISTINCT_ID_KEY, id);
    return id;
  } catch {
    return newTaskId();
  }
}

export function persistUtmFromUrl(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    const source = params.get('utm_source')?.trim();
    const campaign = params.get('utm_campaign')?.trim();
    const content = params.get('utm_content')?.trim();
    if (!source && !campaign && !content) return;
    localStorage.setItem(
      UTM_KEY,
      JSON.stringify({
        utm_source: source ?? '',
        utm_campaign: campaign ?? '',
        utm_content: content ?? '',
      }),
    );
  } catch {
    /* ignore */
  }
}

function readUtm(): Record<string, string> {
  try {
    const raw = localStorage.getItem(UTM_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function trackProductEvent(
  event: string,
  properties: Record<string, string | number | boolean> = {},
  settingsEnabled: boolean,
): void {
  if (!analyticsAllowed(settingsEnabled)) return;

  const apiKey = import.meta.env.VITE_POSTHOG_KEY?.trim();
  if (!apiKey) return;

  const host = (import.meta.env.VITE_POSTHOG_HOST?.trim() || 'https://eu.i.posthog.com').replace(/\/$/, '');
  const distinctId = getAnalyticsDistinctId();
  const body = JSON.stringify({
    api_key: apiKey,
    event,
    distinct_id: distinctId,
    properties: {
      ...readUtm(),
      ...properties,
      distinct_id: distinctId,
      standalone: isStandaloneApp(),
    },
  });

  const url = `${host}/capture/`;
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    return;
  }
  void fetch(url, { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true });
}

/** Один раз за сессию браузера. */
export function trackAppOpenOnce(settingsEnabled: boolean, locale: string): void {
  try {
    if (sessionStorage.getItem(SESSION_OPEN_KEY) === '1') return;
    sessionStorage.setItem(SESSION_OPEN_KEY, '1');
  } catch {
    /* ignore */
  }
  trackProductEvent('app_open', { locale }, settingsEnabled);
}

/** Язык из ?lang= и браузера (не по стране). */
export function resolveLaunchLocale(current: Locale): Locale {
  try {
    const param = new URLSearchParams(window.location.search).get('lang')?.trim().toLowerCase();
    if (param === 'ru' || param === 'en' || param === 'es') return param;
  } catch {
    /* ignore */
  }
  if (current !== 'ru') return current;
  try {
    const nav = navigator.language.toLowerCase();
    if (nav.startsWith('ru')) return 'ru';
    if (nav.startsWith('es')) return 'es';
    if (nav.startsWith('en')) return 'en';
  } catch {
    /* ignore */
  }
  return 'en';
}

export function trackCalendarTask(
  settingsEnabled: boolean,
  opts: { isNew: boolean; completed: boolean; category: TaskCategory },
): void {
  if (opts.isNew) {
    trackProductEvent('task_created', { category: opts.category }, settingsEnabled);
    try {
      if (localStorage.getItem(FIRST_TASK_KEY) !== '1') {
        localStorage.setItem(FIRST_TASK_KEY, '1');
        trackProductEvent('first_task_created', { category: opts.category }, settingsEnabled);
      }
    } catch {
      /* ignore */
    }
  }
  if (opts.completed) {
    trackProductEvent('task_completed', { category: opts.category }, settingsEnabled);
  }
}

export function trackPushEnabledOnce(settingsEnabled: boolean): void {
  try {
    if (localStorage.getItem(PUSH_ENABLED_KEY) === '1') return;
    localStorage.setItem(PUSH_ENABLED_KEY, '1');
  } catch {
    return;
  }
  trackProductEvent('push_enabled', {}, settingsEnabled);
}

export function trackSignupLocal(settingsEnabled: boolean): void {
  trackProductEvent('signup_local', {}, settingsEnabled);
}

export function trackOnboardingComplete(settingsEnabled: boolean, locale: string): void {
  trackProductEvent('onboarding_complete', { locale }, settingsEnabled);
}

export function trackSupportAuthorClick(settingsEnabled: boolean, action: 'copy' | 'open_wallet'): void {
  trackProductEvent('support_author_click', { action }, settingsEnabled);
}

export function trackInstallHintClick(settingsEnabled: boolean, platform: 'ios' | 'android'): void {
  trackProductEvent('install_hint_click', { platform }, settingsEnabled);
}

export async function trackLumiProductEvent(
  event: 'wish_created' | 'wish_step_created',
  properties: Record<string, string | number | boolean> = {},
): Promise<void> {
  const { getSettings } = await import('../db');
  const settings = await getSettings();
  trackProductEvent(event, properties, settings.analyticsEnabled);
}
