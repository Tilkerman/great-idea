import type { Task } from '../types';
import { addDays, isLockedCreateDay, isPastDay, localDateFromYmd, startOfDay, toLocalDateString } from './date';
import { createDraftTask, getDateStrFromTask, getHourFromTask, getTasksInHour, MAX_TASKS_PER_HOUR } from './hourSlot';
import { newTaskId } from './id';

function isFutureDay(d: Date, now: Date) {
  return startOfDay(d).getTime() > startOfDay(now).getTime();
}

/** JS Date.getDay(): 0 = вс … 6 = сб. Пн–пт. */
export const REPEAT_WEEKDAYS_MON_FRI: number[] = [1, 2, 3, 4, 5];

/** Порядок кружков в всплывашке: пн → вс. */
export const REPEAT_WEEKDAY_ORDER: number[] = [1, 2, 3, 4, 5, 6, 0];

export const REPEAT_HORIZON_DAYS = 120;

export function normalizeRepeatWeekdays(days: number[] | null | undefined): number[] {
  const uniq = new Set((days ?? []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6));
  return REPEAT_WEEKDAY_ORDER.filter((d) => uniq.has(d));
}

export function isRepeatOn(days: number[] | null | undefined): boolean {
  return normalizeRepeatWeekdays(days).length > 0;
}

export function toggleRepeatWeekday(days: number[], weekday: number): number[] {
  const next = normalizeRepeatWeekdays(days);
  return next.includes(weekday)
    ? next.filter((d) => d !== weekday)
    : normalizeRepeatWeekdays([...next, weekday]);
}

export function isWeekdaysMonFri(days: number[] | null | undefined): boolean {
  const n = normalizeRepeatWeekdays(days);
  return n.length === 5 && REPEAT_WEEKDAYS_MON_FRI.every((d) => n.includes(d));
}

export function formatRepeatDaysLabel(days: number[] | null | undefined, labelsMonSun: readonly string[]): string {
  const n = normalizeRepeatWeekdays(days);
  if (n.length === 0) return '';
  return n
    .map((d) => {
      const i = REPEAT_WEEKDAY_ORDER.indexOf(d);
      const raw = labelsMonSun[i] ?? '';
      if (!raw) return '';
      return raw.charAt(0) + raw.slice(1).toLowerCase();
    })
    .filter(Boolean)
    .join(', ');
}

export function listRepeatDateStrs(
  origin: Date,
  weekdays: number[],
  now = new Date(),
  horizonDays = REPEAT_HORIZON_DAYS,
): string[] {
  const selected = new Set(normalizeRepeatWeekdays(weekdays));
  const originStr = toLocalDateString(origin);
  if (selected.size === 0) return [originStr];

  const from = isPastDay(origin, now) ? startOfDay(now) : startOfDay(origin);
  const to = addDays(from, horizonDays);
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (ymd: string) => {
    if (seen.has(ymd)) return;
    seen.add(ymd);
    out.push(ymd);
  };
  push(originStr);

  for (let d = new Date(from); d.getTime() <= to.getTime(); d = addDays(d, 1)) {
    const ymd = toLocalDateString(d);
    if (!selected.has(d.getDay())) continue;
    if (ymd !== originStr && isLockedCreateDay(d, now)) continue;
    push(ymd);
  }
  return out;
}

function withoutLumiLink(task: Task): Task {
  const next = { ...task };
  delete next.lumiDesireId;
  delete next.lumiActionItemId;
  delete next.lumiDesireTitle;
  return next;
}

function stampRepeat(task: Task, weekdays: number[] | null, seriesId: string | null): Task {
  return {
    ...task,
    repeatWeekdays: weekdays && weekdays.length > 0 ? weekdays : null,
    repeatSeriesId: seriesId,
    updatedAt: new Date().toISOString(),
  };
}

export function planRepeatSeries(args: {
  tasks: Task[];
  origin: Task;
  hour: number;
  weekdays: number[] | null | undefined;
  now?: Date;
}): { upsert: Task[]; deleteIds: string[] } {
  const now = args.now ?? new Date();
  const weekdays = normalizeRepeatWeekdays(args.weekdays);
  const originDay = new Date(args.origin.startAt);
  const originDate = getDateStrFromTask(args.origin);
  const prevSeriesId = args.origin.repeatSeriesId ?? null;
  const members = prevSeriesId
    ? args.tasks.filter((t) => t.repeatSeriesId === prevSeriesId && t.id !== args.origin.id)
    : [];

  if (weekdays.length === 0) {
    const deleteIds: string[] = [];
    const upsert: Task[] = [stampRepeat(args.origin, null, null)];
    for (const m of members) {
      if (isFutureDay(new Date(m.startAt), now)) {
        deleteIds.push(m.id);
      } else {
        upsert.push(stampRepeat(m, null, null));
      }
    }
    return { upsert, deleteIds };
  }

  const seriesId = prevSeriesId || newTaskId();
  const desired = new Set(listRepeatDateStrs(originDay, weekdays, now));
  desired.add(originDate);

  const deleteIds: string[] = [];
  const upsert: Task[] = [stampRepeat(args.origin, weekdays, seriesId)];
  const keptByDate = new Map<string, Task>();

  for (const m of members) {
    const dateStr = getDateStrFromTask(m);
    const hour = getHourFromTask(m);
    const weekday = new Date(m.startAt).getDay();
    const wanted = desired.has(dateStr) && weekdays.includes(weekday);
    if (!wanted) {
      if (isFutureDay(new Date(m.startAt), now)) {
        deleteIds.push(m.id);
      } else {
        upsert.push(stampRepeat(m, null, null));
      }
      continue;
    }
    if (hour !== args.hour) {
      if (isFutureDay(new Date(m.startAt), now)) {
        deleteIds.push(m.id);
      } else {
        upsert.push(stampRepeat(m, null, null));
      }
      continue;
    }
    keptByDate.set(dateStr, stampRepeat(m, weekdays, seriesId));
  }

  const live = args.tasks.filter((t) => !deleteIds.includes(t.id));

  for (const dateStr of desired) {
    if (dateStr === originDate) continue;
    const day = localDateFromYmd(dateStr);
    if (isLockedCreateDay(day, now)) continue;
    const kept = keptByDate.get(dateStr);
    if (kept) {
      upsert.push(kept);
      continue;
    }
    const inHour = getTasksInHour(live, dateStr, args.hour).filter((t) => t.id !== args.origin.id);
    if (inHour.length >= MAX_TASKS_PER_HOUR) continue;
    const clone = withoutLumiLink(createDraftTask(day, args.hour, inHour));
    upsert.push({
      ...clone,
      title: args.origin.title,
      description: args.origin.description,
      category: args.origin.category,
      important: args.origin.important,
      reminderOffsetMinutes: args.origin.reminderOffsetMinutes,
      status: 'active',
      repeatWeekdays: weekdays,
      repeatSeriesId: seriesId,
    });
    live.push(clone);
  }

  return { upsert, deleteIds };
}
