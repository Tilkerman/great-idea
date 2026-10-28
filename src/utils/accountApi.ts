import type { Locale, UserSession } from '../types';
import { acceptLanguageForLocale, parseAppLocale, runtimeLocale } from './appLocale';

type ApiUser = {
  id: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
};

export type AccountApiErrorCode =
  | 'invalid_credentials'
  | 'email_taken'
  | 'email_not_verified'
  | 'invalid_registration'
  | 'invalid_email'
  | 'too_many_requests'
  | 'mail_failed'
  | 'network';

export class AccountApiError extends Error {
  constructor(public readonly code: AccountApiErrorCode) {
    super(code);
  }
}

const PREFERRED_BASE_KEY = 'tili-account-api-base';
const KNOWN_API_HOSTS = ['https://tili.su', 'https://api.tili.su'] as const;

export function accountApiBase(): string | null {
  const url = import.meta.env.VITE_ACCOUNT_API_URL?.trim().replace(/\/$/, '');
  return url || null;
}

export function isCloudAccountEnabled(): boolean {
  return Boolean(accountApiBase());
}

function rememberApiBase(base: string) {
  try {
    sessionStorage.setItem(PREFERRED_BASE_KEY, base);
  } catch {
    /* private mode */
  }
}

export function accountApiBases(): string[] {
  const primary = accountApiBase();
  const preferred = (() => {
    try {
      return sessionStorage.getItem(PREFERRED_BASE_KEY);
    } catch {
      return null;
    }
  })();
  const ordered = [preferred, primary, ...KNOWN_API_HOSTS].filter(
    (value): value is string => Boolean(value),
  );
  return [...new Set(ordered)];
}

function toSession(user: ApiUser): UserSession {
  return {
    isGuest: false,
    name: user.displayName,
    email: user.email,
    emailVerified: user.emailVerified,
  };
}

const API_TIMEOUT_MS = 8_000;

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function cloudFetch(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<Response> {
  const bases = accountApiBases();
  if (bases.length === 0) throw new AccountApiError('network');

  const headers = new Headers(init?.headers);
  let body = init?.body;
  if (init?.json !== undefined) {
    headers.set('content-type', 'application/json');
    body = JSON.stringify(init.json);
  }
  if (!headers.has('accept-language')) {
    headers.set('accept-language', acceptLanguageForLocale(runtimeLocale()));
  }

  let unauthorized: Response | null = null;
  for (const base of bases) {
    try {
      const response = await fetchWithTimeout(`${base}${path}`, {
        ...init,
        headers,
        body,
        credentials: 'include',
      });
      if (response.status === 401 && response !== unauthorized) {
        unauthorized = response;
        continue;
      }
      rememberApiBase(base);
      return response;
    } catch {
      continue;
    }
  }
  if (unauthorized) return unauthorized;
  throw new AccountApiError('network');
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const response = await cloudFetch(path, init);

  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => ({})) as { error?: string; user?: ApiUser };
  const code = payload.error as AccountApiErrorCode | undefined;

  if (!response.ok) {
    if (code === 'email_taken' || code === 'invalid_credentials' || code === 'email_not_verified'
      || code === 'invalid_registration' || code === 'invalid_email' || code === 'too_many_requests'
      || code === 'mail_failed') {
      throw new AccountApiError(code);
    }
    throw new AccountApiError('network');
  }

  return payload as T;
}

export async function fetchCloudSession(): Promise<UserSession | null> {
  if (!isCloudAccountEnabled()) return null;
  try {
    const data = await apiFetch<{ user: ApiUser }>('/v1/auth/session');
    return toSession(data.user);
  } catch {
    return null;
  }
}

function mailLocale(locale?: Locale): Locale {
  return parseAppLocale(locale) ?? runtimeLocale();
}

export async function registerCloudAccount(input: {
  displayName: string;
  email: string;
  password: string;
  locale: Locale;
}): Promise<{ user: ApiUser; emailSent: boolean }> {
  const data = await apiFetch<{ user: ApiUser; emailSent?: boolean }>('/v1/auth/register', {
    method: 'POST',
    json: {
      displayName: input.displayName,
      email: input.email,
      password: input.password,
      locale: mailLocale(input.locale),
    },
  });
  return { user: data.user, emailSent: data.emailSent !== false };
}

export async function loginCloudAccount(email: string, password: string): Promise<UserSession> {
  const data = await apiFetch<{ user: ApiUser }>('/v1/auth/login', {
    method: 'POST',
    json: { email, password },
  });
  return toSession(data.user);
}

export async function logoutCloudAccount(): Promise<void> {
  if (!isCloudAccountEnabled()) return;
  await apiFetch('/v1/auth/logout', { method: 'POST' });
}

export async function requestVerifyEmail(email: string, locale: Locale): Promise<void> {
  await apiFetch('/v1/auth/verify-email/request', {
    method: 'POST',
    json: { email, locale: mailLocale(locale) },
  });
}

export async function requestPasswordResetEmail(email: string, locale: Locale): Promise<void> {
  await apiFetch('/v1/auth/password-reset/request', {
    method: 'POST',
    json: { email, locale: mailLocale(locale) },
  });
}

export async function changeCloudPassword(
  currentPassword: string,
  nextPassword: string,
): Promise<boolean> {
  try {
    await apiFetch('/v1/auth/password/change', {
      method: 'POST',
      json: { currentPassword, nextPassword },
    });
    return true;
  } catch (error) {
    if (error instanceof AccountApiError && error.code === 'invalid_credentials') return false;
    throw error;
  }
}

export async function deleteCloudAccount(password: string): Promise<boolean> {
  try {
    await apiFetch('/v1/auth/account/delete', {
      method: 'POST',
      json: { password },
    });
    return true;
  } catch (error) {
    if (error instanceof AccountApiError && error.code === 'invalid_credentials') return false;
    throw error;
  }
}

export async function updateCloudProfile(displayName: string): Promise<UserSession | null> {
  const data = await apiFetch<{ user: ApiUser }>('/v1/auth/profile', {
    method: 'PATCH',
    json: { displayName },
  });
  return toSession(data.user);
}
