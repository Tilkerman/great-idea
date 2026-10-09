# TiLi account API

This is the portable server foundation for shared TiLi accounts. It is deliberately
separate from the PWA: the guest calendar, Lumi data, and existing Yandex push
function keep working while this service is built and tested.

## What exists in this first step

- Docker-ready Fastify API with `GET /healthz`;
- PostgreSQL migrations for users, password-reset/email-verification tokens,
  sessions, and per-device Web Push subscriptions;
- API groundwork for registration, password login, cookie sessions, logout, and
  reading the current session;
- email confirmation and password-reset links, sent through Unisender only when
  `UNISENDER_API_KEY` is present;
- CORS restricted by an explicit environment variable;
- standard PostgreSQL and Docker, so the same service can run on Yandex Cloud,
  a VPS, or another provider.

The PWA does not call the authentication API yet. Mail stays off until the
Unisender key is supplied outside Git, so no existing IndexedDB data is uploaded
or changed by this service.

## Local run

1. Copy `.env.example` to `.env.local` and set a unique local database password.
2. Run `docker compose --env-file .env.local up --build`.
3. Open `http://localhost:8080/healthz`.

Docker is not installed in the current development machine, so the compose stack
must be run on a machine with Docker or later in Yandex Cloud.

## Production principles

- Publish the API only as `https://api.tili.su`; the PWA must never point at a
  cloud-provider-specific function URL.
- Keep database, SMTP, session, and VAPID secrets in Yandex Lockbox or the target
  provider's secret manager, never in Git or a public PDF.
- Put a rate limit in front of `/v1/auth/*` at the deployment ingress before
  public exposure. The portable service intentionally does not depend on a
  particular cloud-provider gateway.
- Use a managed PostgreSQL backup schedule and test restoring it before enabling
  migration for users.
- Keep the current Yandex push function active until subscriptions have been
  migrated and verified against this API.
