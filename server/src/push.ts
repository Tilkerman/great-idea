import type { Pool } from 'pg';
import webpush from 'web-push';
import type { AppConfig } from './config.js';

const DAY_MS = 24 * 60 * 60 * 1000;

type Reminder = {
  id: string;
  kind?: string;
  fireAt: number;
  title: string;
  body: string;
};

type PushSubscriptionJSON = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
};

type DeviceRow = {
  device_id: string;
  subscription: PushSubscriptionJSON | null;
  reminders: Reminder[] | null;
};

export type PushActionResult = {
  ok: boolean;
  error?: string;
  count?: number;
  sent?: number;
  devices?: number;
  service?: string;
};

function isLumiDaily(row: Reminder | null | undefined): boolean {
  return Boolean(row && (row.kind === 'lumi-daily' || row.id === 'lumi-daily'));
}

function nextLumiFireAt(fireAt: number, now: number): number {
  let t = Number(fireAt) || now;
  while (t <= now) t += DAY_MS;
  return t;
}

function configureVapid(config: AppConfig): boolean {
  if (!config.VAPID_PUBLIC || !config.VAPID_PRIVATE) return false;
  webpush.setVapidDetails(config.VAPID_SUBJECT, config.VAPID_PUBLIC, config.VAPID_PRIVATE);
  return true;
}

async function loadDevice(db: Pool, deviceId: string): Promise<DeviceRow | null> {
  const result = await db.query<DeviceRow>(
    'select device_id, subscription, reminders from push_devices where device_id = $1 and revoked_at is null',
    [deviceId],
  );
  return result.rows[0] ?? null;
}

async function upsertDevice(
  db: Pool,
  deviceId: string,
  subscription: PushSubscriptionJSON | null,
  reminders: Reminder[],
): Promise<void> {
  await db.query(
    `insert into push_devices (device_id, subscription, reminders, updated_at)
     values ($1, $2, $3::jsonb, now())
     on conflict (device_id) do update set
       subscription = coalesce(excluded.subscription, push_devices.subscription),
       reminders = excluded.reminders,
       updated_at = now(),
       revoked_at = null`,
    [deviceId, subscription, JSON.stringify(reminders)],
  );
}

async function revokeDevice(db: Pool, deviceId: string): Promise<void> {
  await db.query(
    'update push_devices set revoked_at = now(), updated_at = now() where device_id = $1',
    [deviceId],
  );
}

async function sendDue(db: Pool, config: AppConfig): Promise<{ sent: number; error?: string }> {
  if (!configureVapid(config)) return { sent: 0, error: 'no-vapid' };
  const now = Date.now();
  const result = await db.query<DeviceRow>(
    `select device_id, subscription, reminders
     from push_devices
     where revoked_at is null and subscription is not null`,
  );
  let sent = 0;
  let lastError: string | undefined;

  for (const row of result.rows) {
    const subscription = row.subscription;
    if (!subscription?.endpoint) continue;
    const reminders = Array.isArray(row.reminders) ? row.reminders : [];
    const due: Reminder[] = [];
    const next: Reminder[] = [];
    for (const reminder of reminders) {
      if (!reminder || !reminder.id) continue;
      if (Number(reminder.fireAt) > now) {
        next.push(reminder);
        continue;
      }
      due.push(reminder);
      if (isLumiDaily(reminder)) {
        next.push({ ...reminder, kind: 'lumi-daily', fireAt: nextLumiFireAt(reminder.fireAt, now) });
      }
    }

    let gone = false;
    for (const reminder of due) {
      const lumi = isLumiDaily(reminder);
      try {
        await webpush.sendNotification(
          subscription as webpush.PushSubscription,
          JSON.stringify({
            title: reminder.title,
            body: reminder.body,
            tag: lumi ? 'lumi-daily' : `task-${reminder.id}`,
            taskId: lumi ? '' : reminder.id,
            open: lumi ? 'lumi' : 'task',
          }),
          { TTL: 86400, urgency: 'high' },
        );
        sent += 1;
      } catch (error) {
        const status = Number((error as { statusCode?: number }).statusCode);
        if (status === 404 || status === 410) {
          await revokeDevice(db, row.device_id);
          gone = true;
          lastError = 'gone';
          break;
        }
        lastError = status ? `send-${status}` : 'send-fail';
        next.push({
          ...reminder,
          fireAt: now + 60_000,
        });
      }
    }
    if (!gone) await upsertDevice(db, row.device_id, subscription, next);
  }

  return { sent, error: lastError };
}

export async function handlePushRequest(
  db: Pool,
  config: AppConfig,
  method: string,
  body: Record<string, unknown>,
): Promise<{ status: number; payload: PushActionResult }> {
  const action = String(body.action || (method === 'GET' ? 'health' : 'health'));

  if (action === 'hello') {
    return { status: 200, payload: { ok: true, service: 'tili-push' } };
  }

  if (method === 'GET' || action === 'health') {
    const count = await db.query<{ n: string }>(
      'select count(*)::text as n from push_devices where revoked_at is null',
    );
    return {
      status: 200,
      payload: { ok: true, service: 'tili-push', devices: Number(count.rows[0]?.n || 0) },
    };
  }

  if (action === 'subscribe') {
    const deviceId = String(body.deviceId || '');
    const subscription = (body.subscription ?? null) as PushSubscriptionJSON | null;
    if (!deviceId || !subscription?.endpoint) {
      return { status: 400, payload: { ok: false, error: 'bad-subscribe' } };
    }
    const prev = await loadDevice(db, deviceId);
    await upsertDevice(db, deviceId, subscription, prev?.reminders ?? []);
    wakePushTicker();
    return { status: 200, payload: { ok: true } };
  }

  if (action === 'reminders') {
    const deviceId = String(body.deviceId || '');
    if (!deviceId) return { status: 400, payload: { ok: false, error: 'no-device' } };
    const prev = await loadDevice(db, deviceId);
    const incoming = Array.isArray(body.reminders) ? (body.reminders as Reminder[]) : [];
    const replace = incoming.length > 0 || body.replace === true;
    if (!replace) {
      wakePushTicker();
      return { status: 200, payload: { ok: true, count: prev?.reminders?.length ?? 0 } };
    }
    const incomingIds = new Set(incoming.map((row) => row && row.id).filter(Boolean));
    const now = Date.now();
    const keepDue = (prev?.reminders ?? []).filter((row) => {
      if (!row || !row.id || incomingIds.has(row.id)) return false;
      if (isLumiDaily(row)) return false;
      return Number(row.fireAt) <= now;
    });
    const reminders = incoming.concat(keepDue);
    await upsertDevice(db, deviceId, prev?.subscription ?? null, reminders);
    wakePushTicker();
    return { status: 200, payload: { ok: true, count: reminders.length } };
  }

  if (action === 'test') {
    const deviceId = String(body.deviceId || '');
    if (!deviceId) return { status: 400, payload: { ok: false, error: 'no-device' } };
    if (!configureVapid(config)) return { status: 503, payload: { ok: false, error: 'no-vapid' } };
    const device = await loadDevice(db, deviceId);
    if (!device?.subscription?.endpoint) {
      return { status: 404, payload: { ok: false, error: 'no-subscription' } };
    }
    const payload = JSON.stringify({
      title: 'TiLi',
      body: 'Проверка уведомления',
      tag: 'tili-test',
      taskId: '',
      open: 'task',
    });
    try {
      await webpush.sendNotification(
        device.subscription as webpush.PushSubscription,
        payload,
        { TTL: 86400, urgency: 'high' },
      );
      return { status: 200, payload: { ok: true, sent: 1 } };
    } catch (error) {
      const status = Number((error as { statusCode?: number }).statusCode);
      if (status === 404 || status === 410) {
        await revokeDevice(db, deviceId);
        return { status: 410, payload: { ok: false, error: 'gone' } };
      }
      return { status: 502, payload: { ok: false, error: status ? `send-${status}` : 'send-fail' } };
    }
  }

  if (action === 'tick') {
    const result = await sendDue(db, config);
    return { status: 200, payload: { ok: true, ...result } };
  }

  return { status: 200, payload: { ok: true, service: 'tili-push' } };
}

const TICK_MIN_MS = 250;
const TICK_MAX_MS = 15_000;

let ticker: {
  wake: () => void;
} | null = null;

export function wakePushTicker(): void {
  ticker?.wake();
}

async function nextTickDelay(db: Pool): Promise<number> {
  const now = Date.now();
  const result = await db.query<{ reminders: Reminder[] | null }>(
    'select reminders from push_devices where revoked_at is null',
  );
  let next = Infinity;
  for (const row of result.rows) {
    for (const reminder of row.reminders ?? []) {
      const fireAt = Number(reminder?.fireAt);
      if (!Number.isFinite(fireAt)) continue;
      if (fireAt <= now) return TICK_MIN_MS;
      if (fireAt < next) next = fireAt;
    }
  }
  if (!Number.isFinite(next)) return TICK_MAX_MS;
  return Math.min(TICK_MAX_MS, Math.max(TICK_MIN_MS, next - now));
}

export function startPushTicker(
  db: Pool,
  config: AppConfig,
  log: { info: (obj: unknown, msg?: string) => void; error: (obj: unknown, msg?: string) => void },
): void {
  let busy = false;
  let rerun = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const schedule = (ms: number) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void tick();
    }, ms);
  };

  const tick = async () => {
    if (busy) {
      rerun = true;
      return;
    }
    busy = true;
    rerun = false;
    try {
      const result = await sendDue(db, config);
      if (result.sent > 0) log.info(result, 'push tick sent');
      if (result.error) log.error(result, 'push tick error');
      const delay = await nextTickDelay(db);
      if (rerun) schedule(TICK_MIN_MS);
      else schedule(delay);
    } catch (error) {
      log.error({ error }, 'push tick failed');
      schedule(TICK_MAX_MS);
    } finally {
      busy = false;
      if (rerun && !timer) schedule(TICK_MIN_MS);
    }
  };

  ticker = {
    wake: () => {
      rerun = true;
      if (!busy) {
        if (timer) clearTimeout(timer);
        timer = null;
        schedule(TICK_MIN_MS);
      }
    },
  };
  void tick();
}
