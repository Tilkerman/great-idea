import type { UserSession } from '../types';

const ACCOUNTS_KEY = 'tili-accounts';

export interface LocalAccount {
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(`tili-v1:${password}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function readAccounts(): LocalAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalAccount[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAccounts(accounts: LocalAccount[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function findAccount(email: string): LocalAccount | undefined {
  const key = normalizeEmail(email);
  return readAccounts().find((a) => a.email === key);
}

export async function createAccount(input: {
  name: string;
  email: string;
  password: string;
}): Promise<LocalAccount> {
  const email = normalizeEmail(input.email);
  if (findAccount(email)) {
    throw new Error('exists');
  }
  const account: LocalAccount = {
    email,
    name: input.name.trim(),
    passwordHash: await hashPassword(input.password),
    createdAt: new Date().toISOString(),
  };
  writeAccounts([...readAccounts(), account]);
  return account;
}

export async function verifyPassword(email: string, password: string): Promise<LocalAccount | null> {
  const account = findAccount(email);
  if (!account) return null;
  const hash = await hashPassword(password);
  return hash === account.passwordHash ? account : null;
}

export async function changePassword(
  email: string,
  currentPassword: string,
  nextPassword: string,
): Promise<boolean> {
  const account = await verifyPassword(email, currentPassword);
  if (!account) return false;
  const hash = await hashPassword(nextPassword);
  writeAccounts(
    readAccounts().map((a) => (a.email === account.email ? { ...a, passwordHash: hash } : a)),
  );
  return true;
}

export async function resetPassword(email: string, nextPassword: string): Promise<boolean> {
  const account = findAccount(email);
  if (!account) return false;
  const hash = await hashPassword(nextPassword);
  writeAccounts(
    readAccounts().map((a) => (a.email === account.email ? { ...a, passwordHash: hash } : a)),
  );
  return true;
}

export function updateAccountProfile(
  email: string,
  patch: { name?: string; email?: string },
): LocalAccount | null {
  const current = findAccount(email);
  if (!current) return null;
  const nextEmail = patch.email ? normalizeEmail(patch.email) : current.email;
  if (nextEmail !== current.email && findAccount(nextEmail)) {
    throw new Error('exists');
  }
  const updated: LocalAccount = {
    ...current,
    name: patch.name?.trim() || current.name,
    email: nextEmail,
  };
  writeAccounts(readAccounts().map((a) => (a.email === current.email ? updated : a)));
  return updated;
}

export function deleteAccount(email: string) {
  const key = normalizeEmail(email);
  writeAccounts(readAccounts().filter((a) => a.email !== key));
}

export function sessionFromAccount(account: LocalAccount): UserSession {
  return {
    isGuest: false,
    name: account.name,
    email: account.email,
  };
}
