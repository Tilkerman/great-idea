import assert from 'node:assert/strict';
import test from 'node:test';
import {
  REPEAT_WEEKDAYS_MON_FRI,
  formatRepeatDaysLabel,
  isWeekdaysMonFri,
  listRepeatDateStrs,
  normalizeRepeatWeekdays,
  planRepeatSeries,
  toggleRepeatWeekday,
} from './taskRepeat.ts';

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
    title: extra.title ?? 'Повтор',
    category: 'work',
    startAt: t.startAt,
    endAt: t.endAt,
    status: 'active',
    important: false,
    reminderOffsetMinutes: null,
    order: extra.order ?? 1,
    createdAt: t.startAt,
    updatedAt: t.startAt,
    ...extra,
  };
}

test('normalizes weekdays to Mon–Sun order', () => {
  assert.deepEqual(normalizeRepeatWeekdays([0, 1, 1, 5]), [1, 5, 0]);
  assert.equal(isWeekdaysMonFri(REPEAT_WEEKDAYS_MON_FRI), true);
  assert.equal(isWeekdaysMonFri([1, 2, 3, 4, 5, 6]), false);
});

test('toggle weekday adds and removes', () => {
  assert.deepEqual(toggleRepeatWeekday([1, 2], 3), [1, 2, 3]);
  assert.deepEqual(toggleRepeatWeekday([1, 2, 3], 2), [1, 3]);
});

test('formats selected days with catalog labels', () => {
  const labels = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
  assert.equal(formatRepeatDaysLabel([1, 2, 3, 4, 5], labels), 'Пн, Вт, Ср, Чт, Пт');
});

test('lists origin plus future matching weekdays and skips past days', () => {
  const origin = new Date(2026, 10, 11, 16, 0, 0, 0); // Wed 11 Nov
  const now = new Date(2026, 10, 11, 9, 0, 0, 0);
  const dates = listRepeatDateStrs(origin, REPEAT_WEEKDAYS_MON_FRI, now, 10);
  assert.ok(dates.includes('2026-11-11'));
  assert.ok(dates.includes('2026-11-12'));
  assert.ok(dates.includes('2026-11-13'));
  assert.ok(dates.includes('2026-11-16'));
  assert.equal(dates.includes('2026-11-10'), false);
  assert.equal(dates.includes('2026-11-14'), false);
  assert.equal(dates.includes('2026-11-15'), false);
});

test('turning off repeat from any copy deletes future siblings and unlinks the past', () => {
  const now = new Date(2026, 10, 12, 10, 0, 0, 0); // Thursday
  const origin = task('wed', '2026-11-11', 16, {
    repeatSeriesId: 's1',
    repeatWeekdays: REPEAT_WEEKDAYS_MON_FRI,
  });
  const thu = task('thu', '2026-11-12', 16, { repeatSeriesId: 's1', repeatWeekdays: REPEAT_WEEKDAYS_MON_FRI });
  const fri = task('fri', '2026-11-13', 16, { repeatSeriesId: 's1', repeatWeekdays: REPEAT_WEEKDAYS_MON_FRI });
  const plan = planRepeatSeries({
    tasks: [origin, thu, fri],
    origin: thu,
    hour: 16,
    weekdays: [],
    now,
  });
  assert.ok(plan.deleteIds.includes('fri'));
  assert.equal(plan.deleteIds.includes('wed'), false);
  const wed = plan.upsert.find((t) => t.id === 'wed');
  const current = plan.upsert.find((t) => t.id === 'thu');
  assert.equal(wed?.repeatSeriesId ?? null, null);
  assert.equal(current?.repeatSeriesId ?? null, null);
});

test('creating a series fills matching days and leaves a full hour alone', () => {
  const now = new Date(2026, 10, 11, 9, 0, 0, 0);
  const origin = task('wed', '2026-11-11', 16, { title: 'Спорт' });
  const blockers = [1, 2, 3, 4, 5].map((n) => task(`b${n}`, '2026-11-12', 16, { order: n, title: `x${n}` }));
  const plan = planRepeatSeries({
    tasks: [origin, ...blockers],
    origin,
    hour: 16,
    weekdays: REPEAT_WEEKDAYS_MON_FRI,
    now,
  });
  assert.equal(plan.deleteIds.length, 0);
  const created = plan.upsert.filter((t) => t.id !== 'wed');
  const localDay = (row) => {
    const d = new Date(row.startAt);
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  };
  assert.ok(created.some((t) => localDay(t) === '2026-11-13'));
  assert.equal(created.some((t) => localDay(t) === '2026-11-12'), false);
  assert.ok(created.every((t) => t.title === 'Спорт'));
  assert.ok(created.every((t) => t.repeatSeriesId && t.repeatSeriesId === plan.upsert[0].repeatSeriesId));
});
