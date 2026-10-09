import type { UserSession } from '../types';

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
  | 'network';

export class AccountApiError extends Error {
  constructor(public readonly code: AccountApiErrorCode) {
    super(code);
  }
}

export function accountApiBase(): string | null {
  const url = import.meta.env.VITE_ACCOUNT_API_URL?.trim().replace(/\/$/, '');
  return url || null;
}

export function isCloudAccountEnabled(): boolean {
  return Boolean(accountApiBase());
}

function toSession(user: ApiUser): UserSession {
  return {
    isGuest: false,
    name: user.displayName,
    email: user.email,
    emailVerified: user.emailVerified,
  };
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const base = accountApiBase();
  if (!base) throw new AccountApiError('network');

  const headers = new Headers(init?.headers);
  let body = init?.body;
  if (init?.json !== undefined) {
    headers.set('content-type', 'application/json');
    body = JSON.stringify(init.json);
  }

  const response = await fetch(`${base}${path}`, {
    ...init,
    headers,
    body,
    credentials: 'include',
  });

  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => ({})) as { error?: string; user?: ApiUser };
  const code = payload.error as AccountApiErrorCode | undefined;

  if (!response.ok) {
    if (code === 'email_taken' || code === 'invalid_credentials' || code === 'email_not_verified'
      || code === 'invalid_registration' || code === 'invalid_email' || code === 'too_many_requests') {
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

export async function registerCloudAccount(input: {
  displayName: string;
  email: string;
  password: string;
}): Promise<ApiUser> {
  const data = await apiFetch<{ user: ApiUser }>('/v1/auth/register', {
    method: 'POST',
    json: {
      displayName: input.displayName,
      email: input.email,
      password: input.password,
    },
  });
  return data.user;
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

export async function requestVerifyEmail(email: string): Promise<void> {
  await apiFetch('/v1/auth/verify-email/request', {
    method: 'POST',
    json: { email },
  });
}

export async function requestPasswordResetEmail(email: string): Promise<void> {
  await apiFetch('/v1/auth/password-reset/request', {
    method: 'POST',
    json: { email },
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
