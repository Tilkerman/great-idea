import type { AppConfig } from './config.js';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export type VoiceDraft = {
  title: string;
  date: string | null;
  hour: number | null;
  category: 'work' | 'personal' | 'family';
};

function buildPrompt(input: {
  text: string;
  locale: string;
  timezone: string;
  todayISO: string;
  dayStart: number;
  dayEnd: number;
}): string {
  return `Parse a spoken calendar note into JSON.
Today: ${input.todayISO}, timezone: ${input.timezone}, locale: ${input.locale}.
Allowed hours: ${input.dayStart}:00–${input.dayEnd}:00 (integer hour only).
Categories (exactly one): work (job, errands, parts, office), personal (rest, hobby, health), family (home, kids, relatives).

Rules:
- title: short task name, no date/time words
- date: YYYY-MM-DD or null if unknown
- hour: integer ${input.dayStart}-${input.dayEnd} or null; map "morning/first half" to ~10, "afternoon" to ~14, "evening" to ~18
- category: work|personal|family

User said:
"""
${input.text}
"""`;
}

function normalizeCategory(value: unknown): VoiceDraft['category'] {
  const v = String(value || '').toLowerCase();
  if (v === 'personal' || v === 'family' || v === 'work') return v;
  if (v.includes('сем') || v.includes('family')) return 'family';
  if (v.includes('лич') || v.includes('personal')) return 'personal';
  return 'work';
}

function clampHour(h: unknown, dayStart: number, dayEnd: number): number | null {
  const n = Number(h);
  if (!Number.isFinite(n)) return null;
  return Math.min(dayEnd, Math.max(dayStart, Math.round(n)));
}

const RU_DOW_STEMS: { re: RegExp; js: number }[] = [
  { re: /(?<!\p{L})понедельник[а-я]*/iu, js: 1 },
  { re: /(?<!\p{L})вторник[а-я]*/iu, js: 2 },
  { re: /(?<!\p{L})сред[ауеыоя]?(?!\p{L})/iu, js: 3 },
  { re: /(?<!\p{L})четверг[а-я]*/iu, js: 4 },
  { re: /(?<!\p{L})пятниц[ауие](?!\p{L})/iu, js: 5 },
  { re: /(?<!\p{L})суббот[ауие](?!\p{L})/iu, js: 6 },
  { re: /(?<!\p{L})воскресень[еяю](?!\p{L})/iu, js: 0 },
];

const HOUR_WORDS: Record<string, number> = {
  семь: 7, восемь: 8, девять: 9, десять: 10,
  одиннадцать: 11, двенадцать: 12, тринадцать: 13, четырнадцать: 14,
  пятнадцать: 15, шестнадцать: 16, семнадцать: 17, восемнадцать: 18,
  девятнадцать: 19, двадцать: 20,
};

function dateFromISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y || 2026, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

function nextWeekday(from: Date, jsDow: number, _hour: number | null): Date {
  const d = new Date(from);
  d.setHours(12, 0, 0, 0);
  const add = (jsDow - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + add);
  return d;
}

function extractHourLocal(text: string, dayStart: number, dayEnd: number): number | null {
  const lower = text.toLowerCase();
  const m = lower.match(/(?:^|\s)(?:на|в|во)\s*(\d{1,2})(?::\d{2})?(?:\s|$|[,.]|час)/)
    || lower.match(/(?:^|\s)(\d{1,2})\s*(?:часов?|ч\.?)/);
  if (m) {
    const h = Number(m[1]);
    if (h >= 0 && h <= 23) return Math.min(dayEnd, Math.max(dayStart, h));
  }
  for (const [word, h] of Object.entries(HOUR_WORDS).sort((a, b) => b[0].length - a[0].length)) {
    if (lower.includes(word)) return Math.min(dayEnd, Math.max(dayStart, h));
  }
  return null;
}

function extractWeekdayLocal(text: string, from: Date, hour: number | null): Date | null {
  for (const { re, js } of RU_DOW_STEMS) {
    if (re.test(text)) return nextWeekday(from, js, hour);
  }
  const lower = text.toLowerCase();
  if (/(?<!\p{L})послезавтра(?!\p{L})/u.test(lower)) {
    const d = new Date(from);
    d.setDate(d.getDate() + 2);
    return d;
  }
  if (/(?<!\p{L})завтра(?!\p{L})/u.test(lower)) {
    const d = new Date(from);
    d.setDate(d.getDate() + 1);
    return d;
  }
  if (/(?<!\p{L})сегодня(?!\p{L})/u.test(lower)) return from;
  return null;
}

function stripSchedule(text: string): string {
  const dow = 'понедельник[а-я]*|вторник[а-я]*|сред[ауеыоя]?|четверг[а-я]*|пятниц[ауие]|суббот[ауие]|воскресень[еяю]';
  const tok = (p: string) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${p})(?![\\p{L}\\p{N}])`, 'giu');
  let s = ` ${text} `;
  s = s.replace(tok(`(?:на|в|во)\\s+(?:${dow})`), ' ');
  s = s.replace(tok('(?:на|в|во)\\s+\\d{1,2}(?::\\d{2})?(?:\\s*(?:часов?|ч\\.?))?'), ' ');
  s = s.replace(tok('\\d{1,2}\\s*(?:часов?|ч\\.)'), ' ');
  s = s.replace(tok('сегодня|завтра|послезавтра'), ' ');
  s = s.replace(tok('поставь|поставить|добавь|добавить|запиши|записать|создай|создать'), ' ');
  s = s.replace(tok('задачу|задача|задачи|дело|напоминание|заметка'), ' ');
  s = s.replace(tok('пожалуйста'), ' ');
  for (const word of Object.keys(HOUR_WORDS).sort((a, b) => b[0].length - a[0].length)) {
    s = s.replace(tok(word), ' ');
  }
  return s.replace(/\s+/g, ' ').trim();
}

function guessTitleLocal(text: string): string {
  const stripped = stripSchedule(text);
  const call = stripped.match(/позвонить\s+\p{L}[\p{L}\s-]{0,40}/iu);
  const raw = (call ? call[0] : stripped) || text;
  const s = raw.replace(/\s+(?:в|на|во)$/iu, '').trim().slice(0, 80);
  if (!s) return text.slice(0, 80);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function titleLooksLikeUtterance(title: string, spoken: string): boolean {
  const n = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
  const a = n(title);
  const b = n(spoken);
  if (!a || !b) return false;
  return a === b || (b.length >= 18 && a.length >= b.length - 4);
}

function localDraft(
  text: string,
  todayISO: string,
  dayStart: number,
  dayEnd: number,
): VoiceDraft {
  const from = dateFromISO(todayISO);
  const hour = extractHourLocal(text, dayStart, dayEnd);
  const day = extractWeekdayLocal(text, from, hour);
  return {
    title: guessTitleLocal(text),
    date: day ? toISODate(day) : null,
    hour,
    category: normalizeCategory(
      /мам|пап|семь|дет|жён|муж/i.test(text) ? 'family' : 'personal',
    ),
  };
}

async function callGroq(apiKey: string, model: string, userPrompt: string) {
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
          content:
            'You output only valid JSON with keys: title (string), date (string|null), hour (number|null), category (work|personal|family).',
        },
        { role: 'user', content: userPrompt },
      ],
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    return { error: 'groq-fail' as const, status: res.status, detail: errText.slice(0, 200) };
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = data?.choices?.[0]?.message?.content;
  if (!raw) return { error: 'empty-response' as const };
  try {
    return { parsed: JSON.parse(raw) as Record<string, unknown> };
  } catch {
    return { error: 'bad-json' as const, raw: String(raw).slice(0, 200) };
  }
}

export async function parseVoiceNote(
  config: AppConfig,
  body: Record<string, unknown>,
): Promise<{ status: number; payload: Record<string, unknown> }> {
  const text = String(body.text || '').trim();
  if (!text || text.length > 2000) {
    return { status: 400, payload: { ok: false, error: 'bad-text' } };
  }

  const locale = String(body.locale || 'ru').slice(0, 8);
  const timezone = String(body.timezone || 'Europe/Moscow').slice(0, 64);
  const todayISO = String(body.todayISO || new Date().toISOString().slice(0, 10)).slice(0, 10);
  const dayStart = Number(body.dayStart) || 7;
  const dayEnd = Number(body.dayEnd) || 21;
  const local = localDraft(text, todayISO, dayStart, dayEnd);

  const apiKey = config.GROQ_API_KEY.trim();
  if (!apiKey) {
    return { status: 200, payload: { ok: true, draft: local } };
  }

  const groq = await callGroq(
    apiKey,
    config.GROQ_MODEL,
    buildPrompt({ text, locale, timezone, todayISO, dayStart, dayEnd }),
  );

  if ('error' in groq) {
    return { status: 200, payload: { ok: true, draft: local } };
  }

  const parsed = groq.parsed || {};
  let date = parsed.date;
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(String(date))) date = null;
  const groqTitle = String(parsed.title || '').trim().slice(0, 120);
  const useGroqTitle = groqTitle.length >= 3 && !titleLooksLikeUtterance(groqTitle, text);

  const draft: VoiceDraft = {
    title: useGroqTitle ? groqTitle : local.title,
    date: local.date || (date ? String(date) : null),
    hour: local.hour ?? clampHour(parsed.hour, dayStart, dayEnd),
    category: normalizeCategory(parsed.category || local.category),
  };

  return { status: 200, payload: { ok: true, draft } };
}
