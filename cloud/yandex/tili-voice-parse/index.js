const ORIGIN = 'https://tilkerman.github.io';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

function buildPrompt({ text, locale, timezone, todayISO, dayStart, dayEnd }) {
  return `Parse a spoken calendar note into JSON.
Today: ${todayISO}, timezone: ${timezone}, locale: ${locale}.
Allowed hours: ${dayStart}:00–${dayEnd}:00 (integer hour only).
Categories (exactly one): work (job, errands, parts, office), personal (rest, hobby, health), family (home, kids, relatives).

Rules:
- title: short task name, no date/time words
- date: YYYY-MM-DD or null if unknown
- hour: integer ${dayStart}-${dayEnd} or null; map "morning/first half" to ~10, "afternoon" to ~14, "evening" to ~18
- category: work|personal|family

User said:
"""
${text}
"""`;
}

function normalizeCategory(value) {
  const v = String(value || '').toLowerCase();
  if (v === 'personal' || v === 'family' || v === 'work') return v;
  if (v.includes('сем') || v.includes('family')) return 'family';
  if (v.includes('лич') || v.includes('personal')) return 'personal';
  return 'work';
}

function clampHour(h, dayStart, dayEnd) {
  const n = Number(h);
  if (!Number.isFinite(n)) return null;
  return Math.min(dayEnd, Math.max(dayStart, Math.round(n)));
}

async function callGroq(apiKey, model, userPrompt) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You output only valid JSON with keys: title (string), date (string|null), hour (number|null), category (work|personal|family).',
        },
        { role: 'user', content: userPrompt },
      ],
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    return { error: 'groq-fail', status: res.status, detail: errText.slice(0, 200) };
  }
  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content;
  if (!raw) return { error: 'empty-response' };
  try {
    return { parsed: JSON.parse(raw) };
  } catch {
    return { error: 'bad-json', raw: String(raw).slice(0, 200) };
  }
}

module.exports.handler = async function (event) {
  const method = event.httpMethod || 'POST';
  if (method === 'OPTIONS') return reply(204, '');

  if (method !== 'POST') {
    return reply(405, { ok: false, error: 'method' });
  }

  const apiKey = process.env.GROQ_API_KEY?.trim();
  const model = process.env.GROQ_MODEL?.trim() || 'openai/gpt-oss-20b';
  if (!apiKey) {
    return reply(503, { ok: false, error: 'no-groq-key' });
  }

  const body = readBody(event);
  const text = String(body.text || '').trim();
  if (!text || text.length > 2000) {
    return reply(400, { ok: false, error: 'bad-text' });
  }

  const locale = String(body.locale || 'ru').slice(0, 8);
  const timezone = String(body.timezone || 'Europe/Moscow').slice(0, 64);
  const todayISO = String(body.todayISO || new Date().toISOString().slice(0, 10)).slice(0, 10);
  const dayStart = Number(body.dayStart) || 7;
  const dayEnd = Number(body.dayEnd) || 21;

  const groq = await callGroq(
    apiKey,
    model,
    buildPrompt({ text, locale, timezone, todayISO, dayStart, dayEnd }),
  );

  if (groq.error) {
    return reply(502, {
      ok: false,
      error: groq.error,
      detail: groq.detail,
      fallback: { title: text.slice(0, 120) },
    });
  }

  const p = groq.parsed || {};
  let date = p.date;
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(String(date))) date = null;

  const result = {
    title: String(p.title || text).trim().slice(0, 120) || text.slice(0, 120),
    date: date || null,
    hour: clampHour(p.hour, dayStart, dayEnd),
    category: normalizeCategory(p.category),
  };

  return reply(200, { ok: true, draft: result });
};
