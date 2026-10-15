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

const EN_DOW: Record<string, number> = {
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
  sunday: 0, sun: 0,
};

const RU_HOUR_WORDS: Record<string, number> = {
  семь: 7, восемь: 8, восем: 8, девять: 9, десять: 10,
  одиннадцать: 11, двенадцать: 12, тринадцать: 13, четырнадцать: 14,
  пятнадцать: 15, шестнадцать: 16, семнадцать: 17, восемнадцать: 18,
  девятнадцать: 19, двадцать: 20, 'двадцать один': 21,
  eleven: 11, twelve: 12, ten: 10,
};

const RU_DOW: Record<string, number> = {
  понедельник: 1, пн: 1,
  вторник: 2, вт: 2,
  среда: 3, ср: 3,
  четверг: 4, чт: 4,
  пятница: 5, пт: 5,
  суббота: 6, сб: 6,
  воскресенье: 0, вс: 0,
};

const RU_MONTHS: { stem: string; month: number }[] = [
  { stem: 'январ', month: 1 },
  { stem: 'феврал', month: 2 },
  { stem: 'март', month: 3 },
  { stem: 'апрел', month: 4 },
  { stem: 'ма[йя]', month: 5 },
  { stem: 'июн', month: 6 },
  { stem: 'июл', month: 7 },
  { stem: 'август', month: 8 },
  { stem: 'сентябр', month: 9 },
  { stem: 'октябр', month: 10 },
  { stem: 'ноябр', month: 11 },
  { stem: 'декабр', month: 12 },
];

const EN_MONTHS: { stem: string; month: number }[] = [
  { stem: 'january', month: 1 },
  { stem: 'jan', month: 1 },
  { stem: 'february', month: 2 },
  { stem: 'feb', month: 2 },
  { stem: 'march', month: 3 },
  { stem: 'mar', month: 3 },
  { stem: 'april', month: 4 },
  { stem: 'apr', month: 4 },
  { stem: 'may', month: 5 },
  { stem: 'june', month: 6 },
  { stem: 'july', month: 7 },
  { stem: 'jul', month: 7 },
  { stem: 'august', month: 8 },
  { stem: 'aug', month: 8 },
  { stem: 'september', month: 9 },
  { stem: 'sep', month: 9 },
  { stem: 'october', month: 10 },
  { stem: 'oct', month: 10 },
  { stem: 'november', month: 11 },
  { stem: 'nov', month: 11 },
  { stem: 'december', month: 12 },
  { stem: 'dec', month: 12 },
];

/** Родительный / разговорный: «пятого января», «третье декабря» */
const RU_ORDINAL_DAY: { re: string; day: number }[] = [
  { re: 'двадцать\\s+перв', day: 21 },
  { re: 'двадцать\\s+втор', day: 22 },
  { re: 'двадцать\\s+трет', day: 23 },
  { re: 'двадцать\\s+четверт', day: 24 },
  { re: 'двадцать\\s+пят', day: 25 },
  { re: 'двадцать\\s+шест', day: 26 },
  { re: 'двадцать\\s+седьм', day: 27 },
  { re: 'двадцать\\s+восьм', day: 28 },
  { re: 'двадцать\\s+девят', day: 29 },
  { re: 'тридцат', day: 30 },
  { re: 'тридцать\\s+перв', day: 31 },
  { re: 'одиннадцат', day: 11 },
  { re: 'двенадцат', day: 12 },
  { re: 'тринадцат', day: 13 },
  { re: 'четырнадцат', day: 14 },
  { re: 'пятнадцат', day: 15 },
  { re: 'шестнадцат', day: 16 },
  { re: 'семнадцат', day: 17 },
  { re: 'восемнадцат', day: 18 },
  { re: 'девятнадцат', day: 19 },
  { re: 'двадцат', day: 20 },
  { re: 'десят', day: 10 },
  { re: 'девят', day: 9 },
  { re: 'восьм', day: 8 },
  { re: 'седьм', day: 7 },
  { re: 'шест', day: 6 },
  { re: 'пят', day: 5 },
  { re: 'четверт', day: 4 },
  { re: 'трет', day: 3 },
  { re: 'втор', day: 2 },
  { re: 'перв', day: 1 },
];

function allMonthStems(): { stem: string; month: number }[] {
  return [...RU_MONTHS, ...EN_MONTHS].sort((a, b) => b.stem.length - a.stem.length);
}

function dayBeforeMonthFragment(before: string): number | null {
  const chunk = before.slice(-28).trim();
  const num = chunk.match(/(\d{1,2})\s*$/);
  if (num) {
    const day = Number(num[1]);
    if (day >= 1 && day <= 31) return day;
  }
  for (const { re, day } of RU_ORDINAL_DAY) {
    if (new RegExp(`${re}[a-zа-я]*\\s*$`, 'i').test(chunk)) return day;
  }
  return null;
}

function monthStemAt(lower: string, from: number): boolean {
  const tail = lower.slice(from);
  return allMonthStems().some(({ stem }) => new RegExp(`^\\s*${stem}[a-zа-я]*`, 'i').test(tail));
}

function calendarDateWithYear(ref: Date, month: number, day: number, yearExplicit?: number): Date {
  let year = yearExplicit ?? ref.getFullYear();
  if (yearExplicit == null) {
    const candidate = new Date(year, month - 1, day, 12, 0, 0, 0);
    const today = new Date(ref);
    today.setHours(12, 0, 0, 0);
    if (candidate < today) year += 1;
  }
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

/** «1 ноября», «3 декабря», «пятого января», «01.11» */
function extractCalendarDate(text: string, ref = new Date()): Date | null {
  const lower = text.toLowerCase();

  for (const { stem, month } of allMonthStems()) {
    const stemRe = new RegExp(stem, 'gi');
    let found: RegExpExecArray | null;
    while ((found = stemRe.exec(lower)) !== null) {
      const before = lower.slice(0, found.index);
      const day = dayBeforeMonthFragment(before);
      if (day != null) return calendarDateWithYear(ref, month, day);
      const after = lower.slice(found.index + found[0].length);
      const afterNum = after.match(/^\s*(\d{1,2})(?:\s|$|[,.])/);
      if (afterNum) {
        const dayAfter = Number(afterNum[1]);
        if (dayAfter >= 1 && dayAfter <= 31) return calendarDateWithYear(ref, month, dayAfter);
      }
    }
  }

  for (const { stem, month } of allMonthStems()) {
    const re = new RegExp(
      `(\\d{1,2})(?:-?(?:го|ое|е|й|я|ье|ье))?\\s*${stem}[a-zа-я]*`,
      'i',
    );
    const m = lower.match(re);
    if (m) {
      const day = Number(m[1]);
      if (day >= 1 && day <= 31) return calendarDateWithYear(ref, month, day);
    }
    for (const { re: ord, day: ordDay } of RU_ORDINAL_DAY) {
      const ordRe = new RegExp(`(?:^|[\\s,])${ord}[a-zа-я]*\\s*${stem}[a-zа-я]*`, 'i');
      if (ordRe.test(lower)) return calendarDateWithYear(ref, month, ordDay);
    }
  }

  const num = lower.match(/(?:^|[\s,])(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?(?:[\s,]|$)/);
  if (num) {
    const day = Number(num[1]);
    const month = Number(num[2]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      let year: number | undefined;
      if (num[3]) {
        year = Number(num[3]);
        if (year < 100) year += 2000;
      }
      return calendarDateWithYear(ref, month, day, year);
    }
  }

  return null;
}

function digitIsDayOfMonth(text: string, match: RegExpExecArray): boolean {
  const afterIndex = match.index + match[0].length;
  if (monthStemAt(text, afterIndex)) return true;
  const before = text.slice(Math.max(0, match.index - 18), match.index);
  for (const { stem } of allMonthStems()) {
    if (new RegExp(`${stem}[a-zа-я]*\\s*$`, 'i').test(before)) return true;
  }
  return false;
}

function nextCalendarDayForJsDow(from: Date, targetJsDow: number, hour: number | null = null): Date {
  const d = new Date(from);
  d.setHours(12, 0, 0, 0);
  const cur = d.getDay();
  let add = (targetJsDow - cur + 7) % 7;
  if (add === 0 && hour != null) {
    const probe = new Date(from);
    probe.setHours(hour, 0, 0, 0);
    if (probe.getTime() <= from.getTime()) add = 7;
  }
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

const RU_DOW_STEMS: { re: RegExp; js: number }[] = [
  { re: /(?<!\p{L})понедельник[а-я]*/iu, js: 1 },
  { re: /(?<!\p{L})вторник[а-я]*/iu, js: 2 },
  { re: /(?<!\p{L})сред[ауеыоя]?(?!\p{L})/iu, js: 3 },
  { re: /(?<!\p{L})четверг[а-я]*/iu, js: 4 },
  { re: /(?<!\p{L})пятниц[ауие](?!\p{L})/iu, js: 5 },
  { re: /(?<!\p{L})суббот[ауие](?!\p{L})/iu, js: 6 },
  { re: /(?<!\p{L})воскресень[еяю](?!\p{L})/iu, js: 0 },
];

function extractRelativeDay(text: string, from: Date): Date | null {
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

function extractWeekday(text: string, from = new Date(), hour: number | null = null): Date | null {
  const lower = text.toLowerCase();
  for (const { re, js } of RU_DOW_STEMS) {
    if (re.test(text)) return nextCalendarDayForJsDow(from, js, hour);
  }
  for (const key of Object.keys(EN_DOW).sort((a, b) => b.length - a.length)) {
    if (key.length <= 3) {
      if (hasRuToken(text, key)) return nextCalendarDayForJsDow(from, EN_DOW[key], hour);
    } else if (lower.includes(key)) {
      return nextCalendarDayForJsDow(from, EN_DOW[key], hour);
    }
  }
  for (const key of Object.keys(RU_DOW).sort((a, b) => b.length - a.length)) {
    if (key.length <= 2 && hasRuToken(text, key)) {
      return nextCalendarDayForJsDow(from, RU_DOW[key], hour);
    }
  }
  return null;
}

function extractHour(text: string, dayStart: number, dayEnd: number): number | null {
  const lower = text.toLowerCase();
  const patterns: { re: RegExp; weak: boolean }[] = [
    { re: /(?:^|\s)(?:на|в)\s*(\d{1,2})(?::00)?(?:\s|$|[,.]|час)/, weak: false },
    { re: /(?:^|\s)(\d{1,2})\s*(?:часов?|ч\.?)(?:\s|$|[,.])/, weak: false },
    { re: /(?:^|\s)(?:на|в)\s*(\d{1,2})(?:\s|$|[,.])/, weak: false },
    { re: /(?:^|\s)(\d{1,2})(?:\s|$|[,.])/, weak: true },
  ];
  const candidates: number[] = [];
  for (const { re, weak } of patterns) {
    const reGlobal = new RegExp(re.source, `${re.flags}g`);
    let m: RegExpExecArray | null;
    while ((m = reGlobal.exec(lower)) !== null) {
      if (weak && digitIsDayOfMonth(lower, m)) continue;
      const h = Number(m[1]);
      if (h >= 0 && h <= 23) candidates.push(h);
    }
  }
  if (candidates.length === 0) {
    for (const [word, h] of Object.entries(RU_HOUR_WORDS).sort((a, b) => b[0].length - a[0].length)) {
      if (lower.includes(word)) {
        candidates.push(h);
        break;
      }
    }
  }
  if (candidates.length === 0) return null;
  const pool = candidates.filter((h) => h >= dayStart && h <= dayEnd);
  const pick = (pool.length ? pool : candidates)[(pool.length ? pool : candidates).length - 1];
  return Math.min(dayEnd, Math.max(dayStart, pick));
}

const TITLE_DOW = 'понедельник[а-я]*|вторник[а-я]*|сред[ауеыоя]?|четверг[а-я]*|пятниц[ауие]|суббот[ауие]|воскресень[еяю]|monday|tuesday|wednesday|thursday|friday|saturday|sunday';

function ruTok(pattern: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${pattern})(?![\\p{L}\\p{N}])`, 'giu');
}

function stripScheduleWords(text: string): string {
  let s = ` ${text} `;
  s = s.replace(ruTok(`(?:на|в|во)\\s+(?:${TITLE_DOW})`), ' ');
  s = s.replace(ruTok('(?:на|в|во)\\s+\\d{1,2}(?::\\d{2})?(?:\\s*(?:часов?|ч\\.?))?'), ' ');
  s = s.replace(ruTok('\\d{1,2}\\s*(?:часов?|ч\\.)'), ' ');
  s = s.replace(ruTok('сегодня|завтра|послезавтра'), ' ');
  s = s.replace(ruTok('поставь|поставить|добавь|добавить|запиши|записать|создай|создать'), ' ');
  s = s.replace(ruTok('задачу|задача|задачи|дело|напоминание|заметка'), ' ');
  s = s.replace(ruTok('пожалуйста'), ' ');
  for (const word of Object.keys(RU_HOUR_WORDS).sort((a, b) => b[0].length - a[0].length)) {
    s = s.replace(ruTok(word.replace(/\s+/g, '\\s+')), ' ');
  }
  return s.replace(/\s+/g, ' ').trim();
}

function guessTitle(text: string): string {
  const stripped = stripScheduleWords(text);
  const call = stripped.match(/позвонить\s+\p{L}[\p{L}\s-]{0,40}/iu);
  const picked = (call ? call[0] : stripped).replace(/\s+(?:в|на|во)$/iu, '').trim();
  const s = (picked.length >= 2 ? picked : text).slice(0, 80);
  if (!s) return text.slice(0, 80);
  return s.charAt(0).toUpperCase() + s.slice(1);
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
  const ref = new Date();
  const hour =
    extractHour(normalized, settings.dayStartHour, settings.dayEndHour)
    ?? extractHour(raw, settings.dayStartHour, settings.dayEndHour);
  const calendar =
    extractCalendarDate(normalized, ref) ?? extractCalendarDate(raw, ref);
  const relative = extractRelativeDay(normalized, ref) ?? extractRelativeDay(raw, ref);
  const weekday = extractWeekday(normalized, ref, hour) ?? extractWeekday(raw, ref, hour);
  const day = calendar ?? relative ?? weekday;
  return {
    title: guessTitle(normalized),
    date: day ? toLocalDateString(day) : null,
    hour,
    category: guessCategory(normalized || raw),
  };
}

function titleLooksLikeUtterance(title: string, raw: string): boolean {
  const n = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
  const a = n(title);
  const b = n(raw);
  if (!a || !b) return false;
  return a === b || (b.length >= 18 && a.length >= b.length - 4);
}

export function mergeVoiceDrafts(local: VoiceTaskDraft, remote: VoiceTaskDraft, raw = ''): VoiceTaskDraft {
  const remoteTitle = remote.title?.trim() ?? '';
  const useRemoteTitle = remoteTitle.length >= 3
    && remoteTitle.length <= 90
    && !/заметка\s+заметка/i.test(remoteTitle)
    && !titleLooksLikeUtterance(remoteTitle, raw);
  return {
    title: useRemoteTitle ? remoteTitle : local.title,
    date: local.date || remote.date,
    hour: local.hour ?? remote.hour,
    category: remote.category || local.category,
  };
}
