import cors from '@fastify/cors';
import Fastify, { type FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  AuthError,
  changeUserPassword,
  confirmEmailAddress,
  createSession,
  findActiveUserByEmail,
  issueEmailToken,
  loginUser,
  readSession,
  registerUser,
  resetPasswordWithToken,
  revokeSession,
  softDeleteUser,
  updateDisplayName,
  verifyUserPassword,
  type SessionUser,
} from './auth.js';
import { readConfig } from './config.js';
import { createPool } from './db.js';
import { sendMail } from './mail.js';
import {
  readCalendarSync,
  readLumiSync,
  writeCalendarSync,
  writeLumiSync,
} from './sync.js';

const config = readConfig();
const db = createPool(config);
const app = Fastify({
  logger: {
    level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  },
});

await app.register(cors, {
  origin(origin, callback) {
    if (!origin || config.corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  },
  credentials: true,
});

app.addContentTypeParser(
  'application/x-www-form-urlencoded',
  { parseAs: 'string' },
  (_request, body, done) => {
    const fields: Record<string, string> = {};
    for (const [key, value] of new URLSearchParams(body)) fields[key] = value;
    done(null, fields);
  },
);

app.get('/healthz', async () => {
  await db.query('select 1');
  return { ok: true };
});

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(10).max(256),
});

const registerSchema = credentialsSchema.extend({
  displayName: z.string().trim().min(2).max(120),
});

const cookieName = 'tili_session';
const cookieMaxAgeSeconds = config.SESSION_TTL_DAYS * 24 * 60 * 60;

function readCookie(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  const prefix = `${name}=`;
  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
}

function sessionCookie(token: string, expiresInSeconds: number): string {
  const parts = [
    `${cookieName}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${expiresInSeconds}`,
  ];
  if (config.NODE_ENV === 'production') parts.push('Secure');
  return parts.join('; ');
}

function authFailure(error: unknown) {
  if (error instanceof AuthError) {
    if (error.code === 'email_taken') return { statusCode: 409, code: error.code };
    if (error.code === 'email_not_verified') return { statusCode: 403, code: error.code };
    return { statusCode: 401, code: error.code };
  }
  throw error;
}

async function sessionFromRequest(request: FastifyRequest): Promise<SessionUser | null> {
  const token = readCookie(request.headers.cookie, cookieName);
  if (!token) return null;
  return readSession(db, token);
}

const syncPutSchema = z.object({
  baseRevision: z.number().int().min(0),
  snapshot: z.unknown(),
});

app.post('/v1/auth/register', async (request, reply) => {
  const input = registerSchema.safeParse(request.body);
  if (!input.success) {
    return reply.code(400).send({ error: 'invalid_registration' });
  }

  try {
    const user = await registerUser(db, input.data);
    await sendVerificationEmail(user);
    return reply.code(201).send({ user, emailVerificationRequired: true });
  } catch (error) {
    const failure = authFailure(error);
    return reply.code(failure.statusCode).send({ error: failure.code });
  }
});

app.post('/v1/auth/login', async (request, reply) => {
  const input = credentialsSchema.safeParse(request.body);
  if (!input.success) {
    return reply.code(400).send({ error: 'invalid_credentials' });
  }

  try {
    const user = await loginUser(db, input.data.email, input.data.password);
    const token = await createSession(
      db,
      user.id,
      config.SESSION_TTL_DAYS,
      request.headers['user-agent'],
      request.ip,
    );
    reply.header('Set-Cookie', sessionCookie(token, cookieMaxAgeSeconds));
    return { user };
  } catch (error) {
    const failure = authFailure(error);
    return reply.code(failure.statusCode).send({ error: failure.code });
  }
});

app.get('/v1/auth/session', async (request, reply) => {
  const token = readCookie(request.headers.cookie, cookieName);
  if (!token) return reply.code(401).send({ error: 'invalid_session' });

  const user = await readSession(db, token);
  if (!user) return reply.code(401).send({ error: 'invalid_session' });
  return { user };
});

const emailSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
});
const resetSchema = z.object({
  token: z.string().trim().min(20).max(256),
  password: z.string().min(10).max(256),
});
const requestLimits = new Map<string, number[]>();

function tooManyRequests(key: string): boolean {
  const now = Date.now();
  const recent = (requestLimits.get(key) ?? []).filter((timestamp) => now - timestamp < 60 * 60 * 1000);
  if (recent.length >= 5) {
    requestLimits.set(key, recent);
    return true;
  }
  recent.push(now);
  requestLimits.set(key, recent);
  return false;
}

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="ru">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<body style="margin:0;background:#f6f3ee;color:#1d1a17;font:18px/1.45 Georgia,serif">
<main style="max-width:32rem;margin:auto;padding:2.5rem 1.25rem">
<h1 style="font-size:1.7rem">${title}</h1>
${body}
</main>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
  })[char] ?? char);
}

function actionLink(path: string, token: string): string {
  const url = new URL(path, config.API_PUBLIC_URL);
  url.searchParams.set('token', token);
  return url.toString();
}

async function deliver(message: Parameters<typeof sendMail>[1], logLabel: string) {
  try {
    const result = await sendMail(config, message);
    if (result === 'skipped') {
      app.log.info(`${logLabel} was not sent because Unisender is not configured`);
    }
  } catch (error) {
    app.log.error({ error }, `${logLabel} could not be sent`);
  }
}

async function sendVerificationEmail(user: SessionUser) {
  if (user.emailVerified) return;
  const token = await issueEmailToken(db, user.id, 'verify-email', 24);
  const link = actionLink('/v1/auth/verify-email/confirm', token);
  await deliver({
    to: user.email,
    subject: 'Подтвердите почту в TiLi',
    text: `Здравствуйте, ${user.displayName}.\n\nПодтвердите почту в течение 24 часов:\n${link}\n\nЕсли вы не создавали аккаунт TiLi, проигнорируйте это письмо.`,
    html: `<p>Здравствуйте, ${escapeHtml(user.displayName)}.</p><p><a href="${escapeHtml(link)}">Подтвердить почту</a></p><p>Ссылка действует 24 часа. Если вы не создавали аккаунт TiLi, проигнорируйте это письмо.</p>`,
  }, 'verification email');
}

app.post('/v1/auth/verify-email/request', async (request, reply) => {
  const input = emailSchema.safeParse(request.body);
  if (!input.success) return reply.code(400).send({ error: 'invalid_email' });
  if (tooManyRequests(`verify:${request.ip}`)) return reply.code(429).send({ error: 'too_many_requests' });

  const user = await findActiveUserByEmail(db, input.data.email);
  if (user && !user.emailVerified) await sendVerificationEmail(user);
  return reply.code(202).send({ ok: true });
});

app.get('/v1/auth/verify-email/confirm', async (request, reply) => {
  const token = z.string().min(20).max(256).safeParse((request.query as { token?: unknown }).token);
  const confirmed = token.success && await confirmEmailAddress(db, token.data);
  return reply.type('text/html; charset=utf-8').send(page(
    confirmed ? 'Почта подтверждена' : 'Ссылка не подошла',
    confirmed
      ? '<p>Адрес сохранён. Можно вернуться в TiLi и войти.</p>'
      : '<p>Ссылка устарела или уже использована. Запросите новое письмо в TiLi.</p>',
  ));
});

app.post('/v1/auth/password-reset/request', async (request, reply) => {
  const input = emailSchema.safeParse(request.body);
  if (!input.success) return reply.code(400).send({ error: 'invalid_email' });
  if (tooManyRequests(`reset:${request.ip}`)) return reply.code(429).send({ error: 'too_many_requests' });

  const user = await findActiveUserByEmail(db, input.data.email);
  if (user) {
    const token = await issueEmailToken(db, user.id, 'reset-password', 1);
    const link = actionLink('/v1/auth/password-reset/confirm', token);
    await deliver({
      to: user.email,
      subject: 'Новый пароль TiLi',
      text: `Сменить пароль можно в течение часа:\n${link}\n\nЕсли вы не запрашивали смену пароля, проигнорируйте это письмо.`,
      html: `<p><a href="${escapeHtml(link)}">Задать новый пароль</a></p><p>Ссылка действует 1 час. Если вы не запрашивали смену пароля, проигнорируйте это письмо.</p>`,
    }, 'password reset email');
  }
  return reply.code(202).send({ ok: true });
});

app.get('/v1/auth/password-reset/confirm', async (request, reply) => {
  const token = z.string().min(20).max(256).safeParse((request.query as { token?: unknown }).token);
  if (!token.success) {
    return reply.type('text/html; charset=utf-8').send(page(
      'Ссылка не подошла',
      '<p>Запросите новое письмо для смены пароля.</p>',
    ));
  }
  return reply.type('text/html; charset=utf-8').send(page(
    'Новый пароль',
    `<form method="post" action="/v1/auth/password-reset/confirm">
      <input type="hidden" name="token" value="${escapeHtml(token.data)}">
      <p><label>Пароль, минимум 10 символов<br><input name="password" type="password" minlength="10" required autocomplete="new-password" style="font:inherit;padding:.6rem;width:100%"></label></p>
      <button type="submit" style="font:inherit;padding:.7rem 1rem">Сохранить пароль</button>
    </form>`,
  ));
});

app.post('/v1/auth/password-reset/confirm', async (request, reply) => {
  const input = resetSchema.safeParse(request.body);
  const wantsHtml = request.headers['content-type']?.includes('application/x-www-form-urlencoded') === true;
  if (!input.success) {
    const message = 'Пароль должен быть не короче 10 символов.';
    return wantsHtml
      ? reply.code(400).type('text/html; charset=utf-8').send(page('Пароль не сохранён', `<p>${message}</p>`))
      : reply.code(400).send({ error: 'invalid_password' });
  }

  const changed = await resetPasswordWithToken(db, input.data.token, input.data.password);
  if (wantsHtml) {
    return reply.code(changed ? 200 : 400).type('text/html; charset=utf-8').send(page(
      changed ? 'Пароль сохранён' : 'Ссылка не подошла',
      changed
        ? '<p>Новый пароль действует. Старые входы на других устройствах закрыты. Вернитесь в TiLi и войдите заново.</p>'
        : '<p>Ссылка устарела или уже использована. Запросите новое письмо.</p>',
    ));
  }
  return changed ? { ok: true } : reply.code(400).send({ error: 'invalid_token' });
});

app.post('/v1/auth/logout', async (request, reply) => {
  const token = readCookie(request.headers.cookie, cookieName);
  if (token) await revokeSession(db, token);
  reply.header('Set-Cookie', sessionCookie('', 0));
  return reply.code(204).send();
});

app.patch('/v1/auth/profile', async (request, reply) => {
  const user = await sessionFromRequest(request);
  if (!user) return reply.code(401).send({ error: 'invalid_session' });

  const input = z.object({ displayName: z.string().trim().min(2).max(120) }).safeParse(request.body);
  if (!input.success) return reply.code(400).send({ error: 'invalid_profile' });

  const updated = await updateDisplayName(db, user.id, input.data.displayName);
  if (!updated) return reply.code(401).send({ error: 'invalid_session' });
  return { user: updated };
});

app.post('/v1/auth/password/change', async (request, reply) => {
  const user = await sessionFromRequest(request);
  if (!user) return reply.code(401).send({ error: 'invalid_session' });

  const input = z.object({
    currentPassword: z.string().min(1).max(256),
    nextPassword: z.string().min(10).max(256),
  }).safeParse(request.body);
  if (!input.success) return reply.code(400).send({ error: 'invalid_password' });

  const ok = await changeUserPassword(
    db,
    user.id,
    input.data.currentPassword,
    input.data.nextPassword,
  );
  if (!ok) return reply.code(401).send({ error: 'invalid_credentials' });
  reply.header('Set-Cookie', sessionCookie('', 0));
  return { ok: true };
});

app.post('/v1/auth/account/delete', async (request, reply) => {
  const user = await sessionFromRequest(request);
  if (!user) return reply.code(401).send({ error: 'invalid_session' });

  const input = z.object({ password: z.string().min(1).max(256) }).safeParse(request.body);
  if (!input.success) return reply.code(400).send({ error: 'invalid_credentials' });

  const ok = await verifyUserPassword(db, user.id, input.data.password);
  if (!ok) return reply.code(401).send({ error: 'invalid_credentials' });

  await softDeleteUser(db, user.id);
  reply.header('Set-Cookie', sessionCookie('', 0));
  return reply.code(204).send();
});

app.get('/v1/sync/calendar', async (request, reply) => {
  const user = await sessionFromRequest(request);
  if (!user) return reply.code(401).send({ error: 'invalid_session' });
  const state = await readCalendarSync(db, user.id);
  return state;
});

app.put('/v1/sync/calendar', async (request, reply) => {
  const user = await sessionFromRequest(request);
  if (!user) return reply.code(401).send({ error: 'invalid_session' });
  const input = syncPutSchema.safeParse(request.body);
  if (!input.success) return reply.code(400).send({ error: 'invalid_sync' });

  const result = await writeCalendarSync(db, user.id, input.data);
  if (!result.ok) {
    return reply.code(409).send({
      error: result.code,
      revision: result.revision,
      snapshot: result.snapshot,
    });
  }
  return { revision: result.revision };
});

app.get('/v1/sync/lumi', async (request, reply) => {
  const user = await sessionFromRequest(request);
  if (!user) return reply.code(401).send({ error: 'invalid_session' });
  return readLumiSync(db, user.id);
});

app.put('/v1/sync/lumi', async (request, reply) => {
  const user = await sessionFromRequest(request);
  if (!user) return reply.code(401).send({ error: 'invalid_session' });
  const input = syncPutSchema.safeParse(request.body);
  if (!input.success) return reply.code(400).send({ error: 'invalid_sync' });

  const result = await writeLumiSync(db, user.id, input.data);
  if (!result.ok) {
    return reply.code(409).send({
      error: result.code,
      revision: result.revision,
      snapshot: result.snapshot,
    });
  }
  return { revision: result.revision };
});

const close = async () => {
  await app.close();
  await db.end();
};

process.once('SIGINT', () => { void close(); });
process.once('SIGTERM', () => { void close(); });

await app.listen({ host: '0.0.0.0', port: config.PORT });
