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
  handlePushRequest,
  startPushTicker,
} from './push.js';
import {
  readCalendarSync,
  readLumiSync,
  writeCalendarSync,
  writeLumiSync,
} from './sync.js';
import { parseVoiceNote } from './voice.js';
import { mailCopy, resolveMailLocale, type MailLocale } from './mailCopy.js';
import { appHomeUrl, escapeHtml, page, transactionalMailHtml } from './webUi.js';

const config = readConfig();
const db = createPool(config);
const app = Fastify({
  // Caddy + Cloudflare sit in front; without this every client is 172.18.0.1
  // and the 5/hour reset cap becomes global.
  trustProxy: true,
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
    for (const [key, value] of new URLSearchParams(String(body))) fields[key] = value;
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
  locale: z.enum(['ru', 'en', 'es']).optional(),
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
  if (config.API_PUBLIC_URL.startsWith('https://')) {
    parts.push('Secure');
    parts[parts.indexOf('SameSite=Lax')] = 'SameSite=None';
  }
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
    const user = await registerUser(db, {
      email: input.data.email,
      displayName: input.data.displayName,
      password: input.data.password,
    });
    const emailSent = await sendVerificationEmail(user, bodyMailLocale(request, input.data.locale));
    return reply.code(201).send({ user, emailVerificationRequired: true, emailSent });
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
  locale: z.enum(['ru', 'en', 'es']).optional(),
});
const resetSchema = z.object({
  token: z.string().trim().min(20).max(256),
  password: z.string().min(10).max(256),
  locale: z.enum(['ru', 'en', 'es']).optional(),
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

function goApp(locale: MailLocale) {
  return { href: appHomeUrl(config.APP_PUBLIC_URL), label: mailCopy(locale).goApp };
}

function actionLink(path: string, token: string, locale: MailLocale): string {
  const url = new URL(path, config.API_PUBLIC_URL);
  url.searchParams.set('token', token);
  url.searchParams.set('lang', locale);
  return url.toString();
}

function acceptLanguageHeader(request: FastifyRequest): string | undefined {
  const raw = request.headers['accept-language'];
  return Array.isArray(raw) ? raw[0] : raw;
}

function bodyMailLocale(request: FastifyRequest, bodyLocale?: unknown): MailLocale {
  return resolveMailLocale({
    bodyLocale,
    acceptLanguage: acceptLanguageHeader(request),
  });
}

function pageLocale(request: FastifyRequest, bodyLocale?: unknown): MailLocale {
  return resolveMailLocale({
    queryLang: (request.query as { lang?: unknown } | undefined)?.lang,
    bodyLocale,
    acceptLanguage: acceptLanguageHeader(request),
  });
}

async function deliver(message: Parameters<typeof sendMail>[1], logLabel: string): Promise<boolean> {
  try {
    const result = await sendMail(config, message);
    if (result === 'skipped') {
      app.log.info(`${logLabel} was not sent because Unisender is not configured`);
      return false;
    }
    return true;
  } catch (error) {
    app.log.error({ err: error }, `${logLabel} could not be sent`);
    return false;
  }
}

async function sendVerificationEmail(user: SessionUser, locale: MailLocale): Promise<boolean> {
  if (user.emailVerified) return true;
  const t = mailCopy(locale);
  const token = await issueEmailToken(db, user.id, 'verify-email', 24);
  const link = actionLink('/v1/auth/verify-email/confirm', token, locale);
  return deliver({
    to: user.email,
    subject: t.verifySubject,
    language: locale,
    text: `${t.verifyText(user.displayName)}\n\n${link}\n\n${t.verifyFootnote}`,
    html: transactionalMailHtml({
      lang: locale,
      title: t.verifyTitle,
      text: t.verifyText(user.displayName),
      buttonLabel: t.verifyButton,
      buttonHref: link,
      footnote: t.verifyFootnote,
    }),
  }, 'verification email');
}

const feedbackSchema = z.object({
  message: z.string().trim().min(10).max(4000),
  contact: z.string().trim().email().max(254).optional(),
  locale: z.enum(['ru', 'en', 'es']).default('ru'),
  website: z.string().max(200).optional(),
});

app.post('/v1/feedback', async (request, reply) => {
  const input = feedbackSchema.safeParse(request.body);
  if (!input.success) return reply.code(400).send({ error: 'invalid_feedback' });

  // Honeypot: bots often fill hidden website fields. Pretend success.
  if (input.data.website) return reply.code(202).send({ ok: true });
  if (tooManyRequests(`feedback:${request.ip}`)) {
    return reply.code(429).send({ error: 'too_many_requests' });
  }

  const contact = input.data.contact || 'не указан';
  const text = [
    'Новое сообщение из TiLi',
    '',
    input.data.message,
    '',
    `Email для ответа: ${contact}`,
    `Язык приложения: ${input.data.locale}`,
  ].join('\n');

  try {
    const result = await sendMail(config, {
      to: config.FEEDBACK_TO_EMAIL,
      subject: 'Обратная связь TiLi',
      text,
      html: [
        '<h1>Новое сообщение из TiLi</h1>',
        `<p style="white-space:pre-wrap">${escapeHtml(input.data.message)}</p>`,
        `<p><strong>Email для ответа:</strong> ${escapeHtml(contact)}</p>`,
        `<p><strong>Язык приложения:</strong> ${escapeHtml(input.data.locale)}</p>`,
      ].join(''),
    });
    if (result === 'skipped') {
      request.log.error('feedback mail is not configured');
      return reply.code(503).send({ error: 'feedback_unavailable' });
    }
    return reply.code(202).send({ ok: true });
  } catch (error) {
    request.log.error({ error }, 'feedback email could not be sent');
    return reply.code(502).send({ error: 'feedback_unavailable' });
  }
});

app.post('/v1/auth/verify-email/request', async (request, reply) => {
  const input = emailSchema.safeParse(request.body);
  if (!input.success) return reply.code(400).send({ error: 'invalid_email' });
  if (tooManyRequests(`verify:${request.ip}:${input.data.email}`)) return reply.code(429).send({ error: 'too_many_requests' });

  const user = await findActiveUserByEmail(db, input.data.email);
  if (user && !user.emailVerified) {
    const emailSent = await sendVerificationEmail(user, bodyMailLocale(request, input.data.locale));
    if (!emailSent) return reply.code(502).send({ error: 'mail_failed' });
  }
  return reply.code(202).send({ ok: true });
});

app.get('/v1/auth/verify-email/confirm', async (request, reply) => {
  const locale = pageLocale(request);
  const t = mailCopy(locale);
  const token = z.string().min(20).max(256).safeParse((request.query as { token?: unknown }).token);
  const confirmed = token.success && await confirmEmailAddress(db, token.data);
  return reply.type('text/html; charset=utf-8').send(page(
    confirmed ? t.verifyOk : t.badLink,
    confirmed
      ? `<p>${escapeHtml(t.verifyOkBody)}</p>`
      : `<p>${escapeHtml(t.badLinkUsed)}</p>`,
    confirmed ? goApp(locale) : undefined,
    locale,
  ));
});

app.post('/v1/auth/password-reset/request', async (request, reply) => {
  const input = emailSchema.safeParse(request.body);
  if (!input.success) return reply.code(400).send({ error: 'invalid_email' });
  if (tooManyRequests(`reset:${request.ip}:${input.data.email}`)) return reply.code(429).send({ error: 'too_many_requests' });

  const locale = bodyMailLocale(request, input.data.locale);
  const t = mailCopy(locale);
  const user = await findActiveUserByEmail(db, input.data.email);
  if (user) {
    const token = await issueEmailToken(db, user.id, 'reset-password', 1);
    const link = actionLink('/v1/auth/password-reset/confirm', token, locale);
    await deliver({
      to: user.email,
      subject: t.resetSubject,
      language: locale,
      text: `${t.resetText}\n${link}\n\n${t.resetFootnote}`,
      html: transactionalMailHtml({
        lang: locale,
        title: t.resetTitle,
        text: t.resetText,
        buttonLabel: t.resetButton,
        buttonHref: link,
        footnote: t.resetFootnote,
      }),
    }, 'password reset email');
  }
  return reply.code(202).send({ ok: true });
});

app.get('/v1/auth/password-reset/confirm', async (request, reply) => {
  const locale = pageLocale(request);
  const t = mailCopy(locale);
  const token = z.string().min(20).max(256).safeParse((request.query as { token?: unknown }).token);
  if (!token.success) {
    return reply.type('text/html; charset=utf-8').send(page(
      t.badLink,
      `<p>${escapeHtml(t.badLinkReset)}</p>`,
      undefined,
      locale,
    ));
  }
  return reply.type('text/html; charset=utf-8').send(page(
    t.resetTitle,
    `<p>${escapeHtml(t.resetPageLead)}</p>
     <form method="post" action="/v1/auth/password-reset/confirm">
      <input type="hidden" name="token" value="${escapeHtml(token.data)}">
      <input type="hidden" name="locale" value="${escapeHtml(locale)}">
      <label for="password">${escapeHtml(t.passwordLabel)}</label>
      <input id="password" name="password" type="password" minlength="10" required autocomplete="new-password">
      <button type="submit">${escapeHtml(t.savePassword)}</button>
    </form>`,
    undefined,
    locale,
  ));
});

app.post('/v1/auth/password-reset/confirm', async (request, reply) => {
  const input = resetSchema.safeParse(request.body);
  const wantsHtml = request.headers['content-type']?.includes('application/x-www-form-urlencoded') === true;
  const locale = pageLocale(request, input.success ? input.data.locale : undefined);
  const t = mailCopy(locale);
  if (!input.success) {
    return wantsHtml
      ? reply.code(400).type('text/html; charset=utf-8').send(page(
        t.passwordNotSaved,
        `<p>${escapeHtml(t.passwordTooShort)}</p>`,
        undefined,
        locale,
      ))
      : reply.code(400).send({ error: 'invalid_password' });
  }

  const changed = await resetPasswordWithToken(db, input.data.token, input.data.password);
  if (wantsHtml) {
    return reply.code(changed ? 200 : 400).type('text/html; charset=utf-8').send(page(
      changed ? t.passwordSaved : t.badLink,
      `<p>${escapeHtml(changed ? t.passwordSavedBody : t.badLinkUsed)}</p>`,
      changed ? goApp(locale) : undefined,
      locale,
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

  const result = await writeCalendarSync(db, user.id, {
    baseRevision: input.data.baseRevision,
    snapshot: input.data.snapshot ?? [],
  });
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

  const result = await writeLumiSync(db, user.id, {
    baseRevision: input.data.baseRevision,
    snapshot: input.data.snapshot ?? {},
  });
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

app.get('/v1/push', async () => {
  const result = await handlePushRequest(db, config, 'GET', { action: 'health' });
  return result.payload;
});

app.post('/v1/push', async (request, reply) => {
  const body = (request.body && typeof request.body === 'object')
    ? request.body as Record<string, unknown>
    : {};
  const reminders = Array.isArray(body.reminders) ? body.reminders : null;
  request.log.info({
    action: String(body.action || ''),
    device: String(body.deviceId || '').slice(0, 8),
    standalone: body.standalone,
    from: typeof body.from === 'string' ? body.from : undefined,
    ua: typeof body.ua === 'string' ? body.ua.slice(0, 120) : undefined,
    reminderCount: reminders ? reminders.length : undefined,
    replace: body.replace,
  }, 'push action');
  const result = await handlePushRequest(db, config, 'POST', body);
  return reply.code(result.status).send(result.payload);
});

app.post('/v1/voice', async (request, reply) => {
  const body = (request.body && typeof request.body === 'object')
    ? request.body as Record<string, unknown>
    : {};
  const result = await parseVoiceNote(config, body);
  return reply.code(result.status).send(result.payload);
});

await app.listen({ host: '0.0.0.0', port: config.PORT });
startPushTicker(db, config, app.log);
