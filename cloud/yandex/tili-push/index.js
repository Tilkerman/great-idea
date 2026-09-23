const webpush = require('web-push');
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');

const ORIGIN = 'https://tilkerman.github.io';
const BUCKET = process.env.S3_BUCKET || 'tili-push-box';
const FILE = 'devices.json';

const s3 = new S3Client({
  region: 'ru-central1',
  endpoint: 'https://storage.yandexcloud.net',
  credentials: {
    accessKeyId: process.env.S3_KEY,
    secretAccessKey: process.env.S3_SECRET,
  },
});

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

async function loadDevices() {
  try {
    const out = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: FILE }));
    const text = await out.Body.transformToString();
    const data = JSON.parse(text);
    return data && typeof data === 'object' ? data : {};
  } catch (err) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) return {};
    throw err;
  }
}

async function saveDevices(devices) {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: FILE,
    Body: JSON.stringify(devices),
    ContentType: 'application/json',
  }));
}

function configureVapid() {
  const publicKey = process.env.VAPID_PUBLIC;
  const privateKey = process.env.VAPID_PRIVATE;
  const subject = process.env.VAPID_SUBJECT || 'mailto:johnbassil@yandex.ru';
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function isLumiDaily(row) {
  return row && (row.kind === 'lumi-daily' || row.id === 'lumi-daily');
}

function nextLumiFireAt(fireAt, now) {
  let t = Number(fireAt) || now;
  while (t <= now) t += DAY_MS;
  return t;
}

async function sendDue(devices) {
  if (!configureVapid()) return { sent: 0, error: 'no-vapid' };
  const now = Date.now();
  let sent = 0;
  for (const device of Object.values(devices)) {
    if (!device.subscription) continue;
    const due = [];
    const next = [];
    for (const row of device.reminders || []) {
      if (row.fireAt > now) {
        next.push(row);
        continue;
      }
      due.push(row);
      if (isLumiDaily(row)) {
        next.push({ ...row, kind: 'lumi-daily', fireAt: nextLumiFireAt(row.fireAt, now) });
      }
    }
    device.reminders = next;
    for (const row of due) {
      const lumi = isLumiDaily(row);
      try {
        await webpush.sendNotification(
          device.subscription,
          JSON.stringify({
            title: row.title,
            body: row.body,
            tag: lumi ? 'lumi-daily' : `task-${row.id}`,
            taskId: lumi ? '' : row.id,
            open: lumi ? 'lumi' : 'task',
          }),
        );
        sent += 1;
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          delete devices[device.deviceId];
          break;
        }
      }
    }
  }
  return { sent };
}

module.exports.handler = async function (event) {
  const devices = await loadDevices();

  if (Array.isArray(event.messages)) {
    const result = await sendDue(devices);
    await saveDevices(devices);
    return reply(200, { ok: true, ...result });
  }

  const method = event.httpMethod || 'GET';
  if (method === 'OPTIONS') return reply(204, '');

  const body = readBody(event);
  const route = routeOf(event, body);

  if (method === 'GET' || route === 'health') {
    return reply(200, { ok: true, service: 'tili-push', devices: Object.keys(devices).length });
  }

  if (route === 'subscribe') {
    const deviceId = String(body.deviceId || '');
    const subscription = body.subscription;
    if (!deviceId || !subscription || !subscription.endpoint) {
      return reply(400, { ok: false, error: 'bad-subscribe' });
    }
    const prev = devices[deviceId] || { deviceId, reminders: [] };
    prev.subscription = subscription;
    devices[deviceId] = prev;
    await saveDevices(devices);
    return reply(200, { ok: true });
  }

  if (route === 'reminders') {
    const deviceId = String(body.deviceId || '');
    if (!deviceId) return reply(400, { ok: false, error: 'no-device' });
    const prev = devices[deviceId] || { deviceId, subscription: null, reminders: [] };
    prev.reminders = Array.isArray(body.reminders) ? body.reminders : [];
    devices[deviceId] = prev;
    await saveDevices(devices);
    return reply(200, { ok: true, count: prev.reminders.length });
  }

  if (route === 'tick') {
    const result = await sendDue(devices);
    await saveDevices(devices);
    return reply(200, { ok: true, ...result });
  }

  return reply(200, { ok: true, service: 'tili-push', devices: Object.keys(devices).length });
};
