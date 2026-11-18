import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPastedTasks,
  copyDayClipboard,
  copyHourClipboard,
  copyWeekClipboard,
} from './gridClipboard.ts';
import { toLocalDateString } from './date.ts';

function atHour(ymd, hour) {
  const [y, m, d] = ymd.split('-').map(Number);
  const start = new Date(y, m - 1, d, hour, 0, 0, 0);
  const end = new Date(start);
  end.setHours(hour + 1);
  return { startAt: start.toISOString(), endAt: end.toISOString() };
}

function task(id, ymd, hour, extra = {}) {
  const t = atHour(ymd, hour);
  return {
    id,
    title: extra.title ?? `Task ${id}`,
    category: extra.category ?? 'work',
    startAt: t.startAt,
    endAt: t.endAt,
    status: extra.status ?? 'active',
    important: false,
    reminderOffsetMinutes: null,
    order: extra.order ?? 1,
    createdAt: t.startAt,
    updatedAt: t.startAt,
    ...extra,
  };
}

test('copy week stores sourceWeekStart', () => {
  const clip = copyWeekClipboard([task('a', '2026-11-16', 9)], new Date(2026, 10, 16), 1);
  assert.equal(clip.kind, 'week');
  assert.equal(clip.sourceWeekStart, '2026-11-16');
  assert.equal(clip.items.length, 1);
});

test('copy day then paste onto another week lands on the same weekday', () => {
  const clip = copyDayClipboard([task('a', '2026-11-18', 10, { title: 'Среда' })], new Date(2026, 10, 18));
  assert.equal(clip.kind, 'day');
  assert.equal(clip.sourceDay, '2026-11-18');
  const pasted = buildPastedTasks(clip, {
    kind: 'week',
    focusDate: new Date(2026, 10, 25),
    weekStartsOn: 1,
  });
  assert.equal(pasted.length, 1);
  assert.equal(toLocalDateString(new Date(pasted[0].startAt)), '2026-11-25');
  assert.equal(new Date(pasted[0].startAt).getHours(), 10);
  assert.equal(pasted[0].title, 'Среда');
});

test('copy day then paste onto a target day keeps hours', () => {
  const clip = copyDayClipboard([
    task('a', '2026-11-18', 9, { title: 'Утро', order: 1 }),
    task('b', '2026-11-18', 14, { title: 'День', order: 1 }),
  ], new Date(2026, 10, 18));
  const pasted = buildPastedTasks(clip, {
    kind: 'day',
    day: new Date(2026, 10, 25),
    weekStartsOn: 1,
  });
  const dates = pasted.map((row) => `${toLocalDateString(new Date(row.startAt))}-${new Date(row.startAt).getHours()}`).sort();
  assert.deepEqual(dates, ['2026-11-25-14', '2026-11-25-9']);
});

test('copy hour then paste onto another day uses the target hour', () => {
  const clip = copyHourClipboard([task('a', '2026-11-18', 11, { title: 'Звонок' })], new Date(2026, 10, 18), 11);
  const pasted = buildPastedTasks(clip, {
    kind: 'hour',
    day: new Date(2026, 10, 26),
    hour: 16,
    weekStartsOn: 1,
  });
  assert.equal(pasted.length, 1);
  assert.equal(toLocalDateString(new Date(pasted[0].startAt)), '2026-11-26');
  assert.equal(new Date(pasted[0].startAt).getHours(), 16);
});

test('copy week then paste onto a day keeps only that weekday', () => {
  const clip = copyWeekClipboard([
    task('mon', '2026-11-16', 9, { title: 'Пн' }),
    task('wed', '2026-11-18', 10, { title: 'Ср' }),
  ], new Date(2026, 10, 16), 1);
  const pasted = buildPastedTasks(clip, {
    kind: 'day',
    day: new Date(2026, 10, 25),
    weekStartsOn: 1,
  });
  assert.equal(pasted.length, 1);
  assert.equal(pasted[0].title, 'Ср');
  assert.equal(toLocalDateString(new Date(pasted[0].startAt)), '2026-11-25');
});
