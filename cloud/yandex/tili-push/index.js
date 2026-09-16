const webpush = require('web-push');

const ORIGIN = 'https://tilkerman.github.io';
const devices = new Map();

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
}

function reply(statusCode, body) {
  return {
    statusCode,
    headers: corsHeaders(),
    body: typeof body === 'string' ? body : JSON.stringify(body),
  };
}

function readBody(event) {
  if (!event.body) return {};
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function routeOf(event, body) {
  const blob = `${event.path || ''} ${event.url || ''} ${event.originalRequest?.url || ''}`;
  const action = (event.queryStringParameters || {}).action || body.action;
  if (action) return String(action);
  if (blob.includes('subscribe')) return 'subscribe';
  if (blob.includes('reminders')) return 'reminders';
  if (blob.includes('tick')) return 'tick';
  return 'health';
}

function configureVapid() {
  const publicKey = process.env.VAPID_PUBLIC;
  const privateKey = process.env.VAPID_PRIVATE;
  const subject = process.env.VAPID_SUBJECT || 'mailto:johnbassil@yandex.ru';
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

async function sendDue() {
  if (!configureVapid()) return { sent: 0, error: 'no-vapid' };
  const now = Date.now();
  let sent = 0;
  for (const device of devices.values()) {
    if (!device.subscription) continue;
    const due = (device.reminders || []).filter((row) => row.fireAt <= now);
    device.reminders = (device.reminders || []).filter((row) => row.fireAt > now);
    for (const row of due) {
      try {
        await webpush.sendNotification(
          device.subscription,
          JSON.stringify({
            title: row.title,
            body: row.body,
            tag: `task-${row.id}`,
          }),
        );
        sent += 1;
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          devices.delete(device.deviceId);
          break;
        }
      }
    }
  }
  return { sent };
}

module.exports.handler = async function (event) {
  if (Array.isArray(event.messages)) {
    const result = await sendDue();
    return reply(200, { ok: true, ...result });
  }

  const method = event.httpMethod || 'GET';
  if (method === 'OPTIONS') return reply(204, '');

  const body = readBody(event);
  const route = routeOf(event, body);

  if (method === 'GET' || route === 'health') {
    return reply(200, { ok: true, service: 'tili-push', devices: devices.size });
  }

  if (route === 'subscribe') {
    const deviceId = String(body.deviceId || '');
    const subscription = body.subscription;
    if (!deviceId || !subscription || !subscription.endpoint) {
      return reply(400, { ok: false, error: 'bad-subscribe' });
    }
    const prev = devices.get(deviceId) || { deviceId, reminders: [] };
    prev.subscription = subscription;
    devices.set(deviceId, prev);
    return reply(200, { ok: true });
  }

  if (route === 'reminders') {
    const deviceId = String(body.deviceId || '');
    if (!deviceId) return reply(400, { ok: false, error: 'no-device' });
    const prev = devices.get(deviceId) || { deviceId, subscription: null, reminders: [] };
    prev.reminders = Array.isArray(body.reminders) ? body.reminders : [];
    devices.set(deviceId, prev);
    return reply(200, { ok: true, count: prev.reminders.length });
  }

  if (route === 'tick') {
    const result = await sendDue();
    return reply(200, { ok: true, ...result });
  }

  return reply(200, { ok: true, service: 'tili-push' });
};
