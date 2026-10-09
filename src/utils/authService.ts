import type { UserSession } from '../types';
import {
  AccountApiError,
  changeCloudPassword,
  deleteCloudAccount,
  isCloudAccountEnabled,
  loginCloudAccount,
  logoutCloudAccount,
  registerCloudAccount,
  requestPasswordResetEmail,
  requestVerifyEmail,
  updateCloudProfile,
} from './accountApi';
import {
  createAccount,
  deleteAccount,
  findAccount,
  isValidEmail,
  normalizeEmail,
  resetPassword,
  sessionFromAccount,
  updateAccountProfile,
  verifyPassword,
  changePassword,
  type LocalAccount,
} from './authLocal';

export { isValidEmail, normalizeEmail, findAccount };
export { isCloudAccountEnabled };

export async function registerAccount(input: {
  name: string;
  email: string;
  password: string;
}): Promise<{ session?: UserSession; cloudPendingVerification?: boolean }> {
  if (isCloudAccountEnabled()) {
    await registerCloudAccount({
      displayName: input.name,
      email: input.email,
      password: input.password,
    });
    return { cloudPendingVerification: true };
  }
  const account = await createAccount(input);
  return { session: sessionFromAccount(account) };
}

export async function loginAccount(email: string, password: string): Promise<UserSession | null> {
  if (isCloudAccountEnabled()) {
    try {
      return await loginCloudAccount(email, password);
    } catch (error) {
      if (error instanceof AccountApiError) throw error;
      return null;
    }
  }
  const account = await verifyPassword(email, password);
  return account ? sessionFromAccount(account) : null;
}

export async function requestAccountPasswordReset(email: string): Promise<boolean> {
  if (isCloudAccountEnabled()) {
    await requestPasswordResetEmail(email);
    return true;
  }
  return Boolean(findAccount(email));
}

export async function resetAccountPassword(email: string, password: string): Promise<boolean> {
  if (isCloudAccountEnabled()) {
    await requestPasswordResetEmail(email);
    return true;
  }
  return resetPassword(email, password);
}

export async function changeAccountPassword(
  email: string,
  currentPassword: string,
  nextPassword: string,
): Promise<boolean> {
  if (isCloudAccountEnabled()) return changeCloudPassword(currentPassword, nextPassword);
  return changePassword(email, currentPassword, nextPassword);
}

export async function removeAccount(email: string, password?: string): Promise<void> {
  if (isCloudAccountEnabled()) {
    if (!password) return;
    const ok = await deleteCloudAccount(password);
    if (!ok) throw new Error('invalid_credentials');
    return;
  }
  deleteAccount(email);
}

export function updateAccount(
  email: string,
  patch: { name?: string; email?: string },
): LocalAccount | null {
  if (isCloudAccountEnabled()) return null;
  return updateAccountProfile(email, patch);
}

export async function updateAccountSession(
  email: string,
  patch: { name?: string },
): Promise<UserSession | null> {
  if (isCloudAccountEnabled() && patch.name) {
    return updateCloudProfile(patch.name.trim());
  }
  const updated = updateAccountProfile(email, { name: patch.name });
  return updated ? sessionFromAccount(updated) : null;
}

export async function signOutAccount(): Promise<void> {
  if (isCloudAccountEnabled()) await logoutCloudAccount();
}

export async function resendVerificationEmail(email: string): Promise<void> {
  if (!isCloudAccountEnabled()) return;
  await requestVerifyEmail(email);
}
