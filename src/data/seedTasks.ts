import type { Task, TaskCategory } from '../types';
import { rebalanceHourTasks } from '../utils/hourSlot';
import { newTaskId } from '../utils/id';
import { toLocalDateString } from '../utils/date';

const today = new Date();
const monday = new Date(today);
const day = monday.getDay();
const diff = day === 0 ? -6 : 1 - day;
monday.setDate(monday.getDate() + diff);

function dayAt(offset: number) {
  const d = new Date(monday);
  d.setDate(d.getDate() + offset);
  return d;
}

type Item = { title: string; category: TaskCategory };

type DaySlots = { hour: number; items: Item[] }[];

function hourBlock(dayOffset: number, hour: number, items: Item[]): Task[] {
  const day = dayAt(dayOffset);
  const now = new Date().toISOString();
  const drafts: Task[] = items.map((item, i) => ({
    id: newTaskId(),
    title: item.title,
    category: item.category,
    startAt: '',
    endAt: '',
    status: 'active',
    important: false,
    reminderOffsetMinutes: null,
    order: i + 1,
    createdAt: now,
    updatedAt: now,
  }));
  return rebalanceHourTasks(day, hour, drafts);
}

function buildWeek(dayOffsetStart: number, slotsByDay: DaySlots[]) {
  const tasks: Task[] = [];
  for (let d = 0; d < 7; d++) {
    const slots = slotsByDay[d] ?? slotsByDay[0];
    for (const slot of slots) {
      tasks.push(...hourBlock(dayOffsetStart + d, slot.hour, slot.items));
    }
  }
  return tasks;
}

const WEEKDAY_EN: DaySlots = [
  { hour: 7, items: [{ title: 'Wake up', category: 'personal' }] },
  { hour: 8, items: [{ title: 'Shower & breakfast', category: 'personal' }] },
  { hour: 9, items: [{ title: 'Commute to work', category: 'personal' }] },
  { hour: 10, items: [{ title: 'Focus work', category: 'work' }] },
  { hour: 11, items: [{ title: 'Team meeting', category: 'work' }] },
  { hour: 12, items: [{ title: 'Lunch', category: 'personal' }] },
  { hour: 14, items: [{ title: 'Grocery shopping', category: 'family' }] },
  { hour: 18, items: [{ title: 'Dinner', category: 'family' }] },
  { hour: 19, items: [{ title: 'Play with the kids', category: 'family' }] },
  { hour: 20, items: [{ title: 'Evening walk', category: 'personal' }] },
];

const WEEKEND_EN: DaySlots = [
  { hour: 8, items: [{ title: 'Wake up', category: 'personal' }] },
  { hour: 10, items: [{ title: 'Grocery shopping', category: 'family' }] },
  { hour: 14, items: [{ title: 'Play with the kids', category: 'family' }] },
  { hour: 18, items: [{ title: 'Dinner', category: 'family' }] },
];

const WEEKDAY_RU: DaySlots = [
  { hour: 7, items: [{ title: 'Подъём', category: 'personal' }] },
  { hour: 8, items: [{ title: 'Зарядка и завтрак', category: 'personal' }] },
  { hour: 9, items: [{ title: 'Путь на работу', category: 'personal' }] },
  { hour: 10, items: [{ title: 'Работа над проектом', category: 'work' }] },
  { hour: 11, items: [{ title: 'Совещание', category: 'work' }] },
  { hour: 12, items: [{ title: 'Обед', category: 'personal' }] },
  { hour: 14, items: [{ title: 'Покупка продуктов', category: 'family' }] },
  { hour: 18, items: [{ title: 'Ужин', category: 'family' }] },
  { hour: 19, items: [{ title: 'Игра с ребёнком', category: 'family' }] },
  { hour: 20, items: [{ title: 'Вечерняя прогулка', category: 'personal' }] },
];

const WEEKEND_RU: DaySlots = [
  { hour: 8, items: [{ title: 'Подъём', category: 'personal' }] },
  { hour: 10, items: [{ title: 'Покупка продуктов', category: 'family' }] },
  { hour: 14, items: [{ title: 'Игра с ребёнком', category: 'family' }] },
  { hour: 18, items: [{ title: 'Ужин', category: 'family' }] },
];

const WEEKDAY_ES: DaySlots = [
  { hour: 7, items: [{ title: 'Levantarse', category: 'personal' }] },
  { hour: 8, items: [{ title: 'Ducha y desayuno', category: 'personal' }] },
  { hour: 9, items: [{ title: 'Camino al trabajo', category: 'personal' }] },
  { hour: 10, items: [{ title: 'Trabajo concentrado', category: 'work' }] },
  { hour: 11, items: [{ title: 'Reunión de equipo', category: 'work' }] },
  { hour: 12, items: [{ title: 'Almuerzo', category: 'personal' }] },
  { hour: 14, items: [{ title: 'Compra de víveres', category: 'family' }] },
  { hour: 18, items: [{ title: 'Cena', category: 'family' }] },
  { hour: 19, items: [{ title: 'Jugar con el niño', category: 'family' }] },
  { hour: 20, items: [{ title: 'Paseo por la tarde', category: 'personal' }] },
];

const WEEKEND_ES: DaySlots = [
  { hour: 8, items: [{ title: 'Levantarse', category: 'personal' }] },
  { hour: 10, items: [{ title: 'Compra de víveres', category: 'family' }] },
  { hour: 14, items: [{ title: 'Jugar con el niño', category: 'family' }] },
  { hour: 18, items: [{ title: 'Cena', category: 'family' }] },
];

/** Пн–пт = weekday, сб–вс = weekend */
function weekPattern(weekday: DaySlots, weekend: DaySlots): DaySlots[] {
  return [0, 1, 2, 3, 4, 5, 6].map((i) => (i >= 5 ? weekend : weekday));
}

/** Три недели подряд: EN → RU → ES (одинаковый распорядок, разные названия). */
export function buildThreeWeekDemoTasks(): Task[] {
  return [
    ...buildWeek(0, weekPattern(WEEKDAY_EN, WEEKEND_EN)),
    ...buildWeek(7, weekPattern(WEEKDAY_RU, WEEKEND_RU)),
    ...buildWeek(14, weekPattern(WEEKDAY_ES, WEEKEND_ES)),
  ];
}

export const SEED_TASKS: Task[] = buildThreeWeekDemoTasks();

export const SEED_WEEK_START = toLocalDateString(monday);
