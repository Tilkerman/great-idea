import type { Task, TaskCategory, UserSettings } from '../types';
import { toLocalDateString } from './date';
import { createDraftTask, createInboxDraft, getTasksInHour } from './hourSlot';
import { pushDeviceId } from './webPush';
import {
  cleanTranscript,
  localVoiceDraftFromText,
  mergeVoiceDrafts,
} from './voiceLocalParse';

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
  const cleaned = cleanTranscript(text);
  const local = localVoiceDraftFromText(cleaned || text, settings);
  const url = parseApiUrl();
  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  if (!url) return local;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: cleaned || text,
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
    };

    if (data.ok && data.draft) {
      const remote: VoiceTaskDraft = {
        title: String(data.draft.title || local.title).slice(0, 120),
        date: data.draft.date,
        hour: data.draft.hour,
        category: data.draft.category === 'personal' || data.draft.category === 'family'
          ? data.draft.category
          : local.category,
      };
      return mergeVoiceDrafts(remote, local);
    }
    if (data.fallback && !data.ok) {
      return mergeVoiceDrafts(
        { title: String(data.fallback.title || ''), date: null, hour: null, category: local.category },
        local,
      );
    }
  } catch {
    /* use local */
  }

  return local;
}

export function buildTaskDraftFromVoice(
  parsed: VoiceTaskDraft,
  transcript: string,
  tasks: Task[],
  settings: UserSettings,
): Task {
  const cleaned = cleanTranscript(transcript);
  const base = createInboxDraft();
  base.title = (parsed.title || cleaned || transcript).trim().slice(0, 120);
  base.category = parsed.category;

  let dateStr = parsed.date;
  let hour = parsed.hour;
  if (dateStr && hour == null) {
    hour = Math.min(settings.dayEndHour, Math.max(settings.dayStartHour, 10));
  }
  if (!dateStr && hour != null) {
    dateStr = toLocalDateString(new Date());
  }

  if (dateStr && hour != null && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const clampedHour = Math.min(settings.dayEndHour, Math.max(settings.dayStartHour, hour));
    const existing = getTasksInHour(tasks, dateStr, clampedHour);
    const [y, m, d] = dateStr.split('-').map(Number);
    const day = new Date(y, (m ?? 1) - 1, d ?? 1);
    const slotDraft = createDraftTask(day, clampedHour, existing);
    return {
      ...slotDraft,
      id: base.id,
      title: base.title,
      category: base.category,
      createdAt: base.createdAt,
    };
  }

  return base;
}
