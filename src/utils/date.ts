export function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function toLocalDateString(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export function addMonths(d: Date, months: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + months);
  return x;
}

export function isSameDay(a: Date, b: Date) {
  return toLocalDateString(a) === toLocalDateString(b);
}

export function getWeekStart(d: Date, weekStartsOn: 0 | 1 = 1) {
  const date = startOfDay(d);
  const day = date.getDay();
  const diff = weekStartsOn === 1
    ? (day === 0 ? -6 : 1 - day)
    : -day;
  return addDays(date, diff);
}

export function getWeekDays(d: Date, weekStartsOn: 0 | 1 = 1) {
  const start = getWeekStart(d, weekStartsOn);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function formatTime(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDateRange(start: Date, end: Date) {
  const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  if (isSameDay(start, end)) {
    return `${start.getDate()} ${months[start.getMonth()]} ${start.getFullYear()}`;
  }
  return `${start.getDate()} ${months[start.getMonth()]} – ${end.getDate()} ${months[end.getMonth()]} ${end.getFullYear()}`;
}

export function getHoursRange(startHour: number, endHour: number) {
  const hours: number[] = [];
  for (let h = startHour; h <= endHour; h++) hours.push(h);
  return hours;
}

export function getWeeksInMonth(year: number, month: number, weekStartsOn: 0 | 1 = 1) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const weeks: { start: Date; end: Date }[] = [];
  let cursor = getWeekStart(first, weekStartsOn);
  while (cursor <= last || weeks.length < 4) {
    const end = addDays(cursor, 6);
    weeks.push({ start: new Date(cursor), end: new Date(end) });
    cursor = addDays(cursor, 7);
    if (cursor.getMonth() > month + 1) break;
    if (weeks.length >= 6) break;
  }
  return weeks.filter((w) => w.start.getMonth() === month || w.end.getMonth() === month);
}

export function parseISO(iso: string) {
  return new Date(iso);
}

export function buildSlotISO(dateStr: string, hour: number, minute = 0) {
  return new Date(`${dateStr}T${pad(hour)}:${pad(minute)}:00`).toISOString();
}
