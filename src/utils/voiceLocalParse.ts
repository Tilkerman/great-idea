import type { TaskCategory, UserSettings } from '../types';
import { toLocalDateString } from './date';
import type { VoiceTaskDraft } from './voiceTaskParse';

/** Убирает типичный «заик» Safari, когда одна фраза клеится много раз. */
export function cleanTranscript(raw: string): string {
  let t = raw.replace(/\s+/g, ' ').trim();
  if (!t) return '';

  const chunks = t.split(/\bзаметка\b/i).map((s) => s.trim()).filter(Boolean);
  if (chunks.length > 1) {
    t = `заметка ${chunks[chunks.length - 1]}`.trim();
  }

  if (t.length > 120) {
    const idx = t.toLowerCase().lastIndexOf('позвонить');
    if (idx >= 0) {
      const head = t.slice(0, idx).trim();
      const tail = t.slice(idx).trim();
      if (head.length >= 8) t = `${head} ${tail}`.trim();
      else t = tail;
    }
  }

  return t.replace(/\s+/g, ' ').trim();
}

const RU_DOW: Record<string, number> = {
  понедельник: 1, пн: 1,
  вторник: 2, вт: 2,
  среда: 3, ср: 3,
  четверг: 4, чт: 4,
  пятница: 5, пт: 5,
  суббота: 6, сб: 6,
  воскресенье: 0, вс: 0,
};

function jsDayFromName(name: string): number | null {
  const key = name.toLowerCase().replace(/\./g, '').trim();
  for (const [k, v] of Object.entries(RU_DOW)) {
    if (key === k || key.startsWith(k)) return v;
  }
  return null;
}

function nextCalendarDayForJsDow(from: Date, targetJsDow: number): Date {
  const d = new Date(from);
  d.setHours(12, 0, 0, 0);
  const cur = d.getDay();
  let add = (targetJsDow - cur + 7) % 7;
  if (add === 0) add = 7;
  d.setDate(d.getDate() + add);
  return d;
}

function hasRuToken(text: string, token: string): boolean {
  const lower = text.toLowerCase();
  if (token.length <= 3) {
    return new RegExp(`(?:^|[\\s,.:;!?])${token}(?:[\\s,.:;!?]|$)`, 'i').test(lower);
  }
  return lower.includes(token);
}

function extractWeekday(text: string): Date | null {
  const lower = text.toLowerCase();
  for (const key of Object.keys(RU_DOW).sort((a, b) => b.length - a.length)) {
    if (key.length <= 2) {
      if (hasRuToken(text, key)) {
        return nextCalendarDayForJsDow(new Date(), RU_DOW[key]);
      }
      continue;
    }
    if (lower.includes(key)) {
      const js = jsDayFromName(key);
      if (js != null) return nextCalendarDayForJsDow(new Date(), js);
    }
  }
  return null;
}

function extractHour(text: string, dayStart: number, dayEnd: number): number | null {
  const lower = text.toLowerCase();
  const patterns = [
    /(?:^|\s)(?:на|в)\s*(\d{1,2})(?::00)?(?:\s|$|час)/,
    /(?:^|\s)(\d{1,2})\s*(?:часов?|ч\.?)(?:\s|$)/,
    /(?:^|\s)(?:на|в)\s*(\d{1,2})(?:\s|$)/,
    /(?:^|\s)(\d{1,2})(?:\s|$)/,
  ];
  const candidates: number[] = [];
  for (const re of patterns) {
    const reGlobal = new RegExp(re.source, `${re.flags}g`);
    let m: RegExpExecArray | null;
    while ((m = reGlobal.exec(lower)) !== null) {
      const h = Number(m[1]);
      if (h >= 0 && h <= 23) candidates.push(h);
    }
  }
  if (candidates.length === 0) return null;
  const pool = candidates.filter((h) => h >= dayStart && h <= dayEnd);
  const pick = (pool.length ? pool : candidates)[(pool.length ? pool : candidates).length - 1];
  return Math.min(dayEnd, Math.max(dayStart, pick));
}

function guessTitle(text: string): string {
  const call = text.match(/позвонить\s+[\p{L}\s]{2,40}/iu);
  if (call) {
    const s = call[0].trim();
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  const stripped = text
    .replace(/\b(заметка|на|четверг|чт|среду|ср|часов?|ч\.)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (stripped.length >= 3) {
    return stripped.charAt(0).toUpperCase() + stripped.slice(1).slice(0, 80);
  }
  return text.slice(0, 80);
}

function guessCategory(text: string): TaskCategory {
  const lower = text.toLowerCase();
  if (/мам|пап|семь|дет|жён|муж/.test(lower)) return 'family';
  if (/отдых|спорт|врач|магаз/.test(lower)) return 'personal';
  return 'personal';
}

/** Локальный разбор без Groq (четверг, 11, «позвонить маме»). */
export function localVoiceDraftFromText(text: string, settings: UserSettings): VoiceTaskDraft {
  const raw = text.replace(/\s+/g, ' ').trim();
  const normalized = cleanTranscript(raw) || raw;
  const day = extractWeekday(normalized) ?? extractWeekday(raw);
  const hour =
    extractHour(normalized, settings.dayStartHour, settings.dayEndHour)
    ?? extractHour(raw, settings.dayStartHour, settings.dayEndHour);
  return {
    title: guessTitle(normalized),
    date: day ? toLocalDateString(day) : null,
    hour,
    category: guessCategory(normalized || raw),
  };
}

export function mergeVoiceDrafts(primary: VoiceTaskDraft, fallback: VoiceTaskDraft): VoiceTaskDraft {
  return {
    title: primary.title || fallback.title,
    date: primary.date || fallback.date,
    hour: primary.hour ?? fallback.hour,
    category: primary.category || fallback.category,
  };
}
