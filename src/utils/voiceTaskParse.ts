import type { Task, TaskCategory, UserSettings } from '../types';
import { createDraftTask, createInboxDraft, getTasksInHour } from './hourSlot';
import { pushDeviceId } from './webPush';

export interface VoiceTaskDraft {
  title: string;
  date: string | null;
  hour: number | null;
  category: TaskCategory;
}

function parseApiUrl() {
  return import.meta.env.VITE_VOICE_PARSE_URL?.trim().replace(/\/$/, '') ?? '';
}

export function voiceParseConfigured() {
  return Boolean(parseApiUrl());
}

export async function requestVoiceTaskParse(
  text: string,
  settings: UserSettings,
): Promise<VoiceTaskDraft> {
  const url = parseApiUrl();
  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  if (!url) {
    return { title: text.slice(0, 120), date: null, hour: null, category: 'work' };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      locale: settings.locale,
      timezone: tz,
      todayISO,
      dayStart: settings.dayStartHour,
      dayEnd: settings.dayEndHour,
      deviceId: pushDeviceId(),
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    draft?: VoiceTaskDraft;
    fallback?: { title?: string };
  };

  if (data.ok && data.draft) {
    return {
      title: String(data.draft.title || text).slice(0, 120),
      date: data.draft.date,
      hour: data.draft.hour,
      category: data.draft.category === 'personal' || data.draft.category === 'family'
        ? data.draft.category
        : 'work',
    };
  }

  return {
    title: String(data.fallback?.title || text).slice(0, 120),
    date: null,
    hour: null,
    category: 'work',
  };
}

export function buildTaskDraftFromVoice(
  parsed: VoiceTaskDraft,
  transcript: string,
  tasks: Task[],
  settings: UserSettings,
): Task {
  const base = createInboxDraft();
  base.title = (parsed.title || transcript).trim().slice(0, 120) || transcript.slice(0, 120);
  base.category = parsed.category;
  const note = transcript.trim();
  if (note && note !== base.title) {
    base.description = note.slice(0, 500);
  }

  if (parsed.date && parsed.hour != null && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) {
    const hour = Math.min(settings.dayEndHour, Math.max(settings.dayStartHour, parsed.hour));
    const existing = getTasksInHour(tasks, parsed.date, hour);
    const [y, m, d] = parsed.date.split('-').map(Number);
    const day = new Date(y, (m ?? 1) - 1, d ?? 1);
    const slotDraft = createDraftTask(day, hour, existing);
    return {
      ...slotDraft,
      id: base.id,
      title: base.title,
      category: base.category,
      description: base.description,
      createdAt: base.createdAt,
    };
  }

  return base;
}
