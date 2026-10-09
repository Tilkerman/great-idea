import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { Pool } from 'pg';

const scrypt = promisify(scryptCallback);
const SCRYPT_KEY_LENGTH = 64;
const SESSION_BYTES = 32;

type UserRow = {
  id: string;
  email: string;
  display_name: string;
  email_verified_at: Date | null;
};

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
};

export class AuthError extends Error {
  constructor(
    public readonly code: 'invalid_credentials' | 'email_taken' | 'invalid_session',
  ) {
    super(code);
  }
}

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('base64url');
  const key = await scrypt(password, salt, SCRYPT_KEY_LENGTH);
  return `scrypt$${salt}$${Buffer.from(key).toString('base64url')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, salt, encodedKey] = stored.split('$');
  if (algorithm !== 'scrypt' || !salt || !encodedKey) return false;

  const expected = Buffer.from(encodedKey, 'base64url');
  const actual = Buffer.from(await scrypt(password, salt, expected.length));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function toSessionUser(row: UserRow): SessionUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    emailVerified: row.email_verified_at !== null,
  };
}

export async function registerUser(
  db: Pool,
  input: { email: string; displayName: string; password: string },
): Promise<SessionUser> {
  const passwordHash = await hashPassword(input.password);
  try {
    const result = await db.query<UserRow>(
      `insert into users (email, display_name, password_hash)
       values ($1, $2, $3)
       returning id, email, display_name, email_verified_at`,
      [input.email, input.displayName, passwordHash],
    );
    return toSessionUser(result.rows[0]!);
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
      throw new AuthError('email_taken');
    }
    throw error;
  }
}

export async function loginUser(
  db: Pool,
  email: string,
  password: string,
): Promise<SessionUser> {
  const result = await db.query<UserRow & { password_hash: string }>(
    `select id, email, display_name, email_verified_at, password_hash
     from users
     where email = $1 and deleted_at is null`,
    [email],
  );
  const row = result.rows[0];
  if (!row || !(await verifyPassword(password, row.password_hash))) {
    throw new AuthError('invalid_credentials');
  }
  return toSessionUser(row);
}

export async function createSession(
  db: Pool,
  userId: string,
  ttlDays: number,
  userAgent: string | undefined,
  ip: string,
): Promise<string> {
  const token = randomBytes(SESSION_BYTES).toString('base64url');
  await db.query(
    `insert into auth_sessions (user_id, token_hash, expires_at, user_agent, ip)
     values ($1, $2, now() + ($3 * interval '1 day'), $4, $5)`,
    [userId, tokenHash(token), ttlDays, userAgent?.slice(0, 512) ?? null, ip],
  );
  return token;
}

export async function readSession(db: Pool, token: string): Promise<SessionUser | null> {
  const result = await db.query<UserRow>(
    `select u.id, u.email, u.display_name, u.email_verified_at
     from auth_sessions s
     join users u on u.id = s.user_id
     where s.token_hash = $1
       and s.revoked_at is null
       and s.expires_at > now()
       and u.deleted_at is null`,
    [tokenHash(token)],
  );
  return result.rows[0] ? toSessionUser(result.rows[0]) : null;
}

export async function revokeSession(db: Pool, token: string): Promise<void> {
  await db.query(
    `update auth_sessions
     set revoked_at = now()
     where token_hash = $1 and revoked_at is null`,
    [tokenHash(token)],
  );
}

export type EmailPurpose = 'verify-email' | 'reset-password';

export async function findActiveUserByEmail(db: Pool, email: string): Promise<SessionUser | null> {
  const result = await db.query<UserRow>(
    `select id, email, display_name, email_verified_at
     from users
     where email = $1 and deleted_at is null`,
    [email],
  );
  return result.rows[0] ? toSessionUser(result.rows[0]) : null;
}

export async function issueEmailToken(
  db: Pool,
  userId: string,
  purpose: EmailPurpose,
  ttlHours: number,
): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  const client = await db.connect();
  try {
    await client.query('begin');
    await client.query(
      `update email_tokens
       set consumed_at = now()
       where user_id = $1 and purpose = $2 and consumed_at is null`,
      [userId, purpose],
    );
    await client.query(
      `insert into email_tokens (user_id, purpose, token_hash, expires_at)
       values ($1, $2, $3, now() + ($4 * interval '1 hour'))`,
      [userId, purpose, tokenHash(token), ttlHours],
    );
    await client.query('commit');
    return token;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

export async function confirmEmailAddress(db: Pool, token: string): Promise<boolean> {
  const client = await db.connect();
  try {
    await client.query('begin');
    const consumed = await client.query<{ user_id: string }>(
      `update email_tokens
       set consumed_at = now()
       where token_hash = $1
         and purpose = 'verify-email'
         and consumed_at is null
         and expires_at > now()
       returning user_id`,
      [tokenHash(token)],
    );
    const userId = consumed.rows[0]?.user_id;
    if (!userId) {
      await client.query('rollback');
      return false;
    }
    await client.query(
      `update users
       set email_verified_at = coalesce(email_verified_at, now()), updated_at = now()
       where id = $1 and deleted_at is null`,
      [userId],
    );
    await client.query('commit');
    return true;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

export async function resetPasswordWithToken(
  db: Pool,
  token: string,
  password: string,
): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  const client = await db.connect();
  try {
    await client.query('begin');
    const consumed = await client.query<{ user_id: string }>(
      `update email_tokens
       set consumed_at = now()
       where token_hash = $1
         and purpose = 'reset-password'
         and consumed_at is null
         and expires_at > now()
       returning user_id`,
      [tokenHash(token)],
    );
    const userId = consumed.rows[0]?.user_id;
    if (!userId) {
      await client.query('rollback');
      return false;
    }
    await client.query(
      `update users
       set password_hash = $2, updated_at = now()
       where id = $1 and deleted_at is null`,
      [userId, passwordHash],
    );
    await client.query(
      `update auth_sessions
       set revoked_at = now()
       where user_id = $1 and revoked_at is null`,
      [userId],
    );
    await client.query('commit');
    return true;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}
