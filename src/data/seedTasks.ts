import type { Task } from '../types';
import { rebalanceHourTasks } from '../utils/hourSlot';
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

type Item = {
  title: string;
  category: Task['category'];
  description?: string;
};

function hourBlock(dayOffset: number, hour: number, items: Item[]): Task[] {
  const day = dayAt(dayOffset);
  const dateStr = toLocalDateString(day);
  const drafts: Task[] = items.map((item, i) => ({
    id: `${dateStr}-${hour}-${i + 1}-${item.title.slice(0, 12)}`,
    title: item.title,
    description: item.description,
    category: item.category,
    startAt: '',
    endAt: '',
    status: 'active',
    important: false,
    order: i + 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
  return rebalanceHourTasks(day, hour, drafts);
}

export const SEED_TASKS: Task[] = [
  // Понедельник — 9:00, два дела по 15 мин (как на макете)
  ...hourBlock(0, 9, [
    { title: 'Функционал «История»', category: 'work', description: 'Рассмотреть и оценить' },
    { title: 'Рекламная кампания Google', category: 'work', description: 'https://ads.google.com/...' },
  ]),
  // Понедельник — одиночные часы
  ...hourBlock(0, 7, [{ title: 'Подъём', category: 'personal' }]),
  ...hourBlock(0, 8, [{ title: 'Зарядка / душ', category: 'personal' }]),
  ...hourBlock(0, 10, [{ title: 'Путь на работу', category: 'personal' }]),
  ...hourBlock(0, 12, [{ title: 'Обед', category: 'personal' }]),
  ...hourBlock(0, 18, [{ title: 'Ужин', category: 'personal' }]),

  // Вторник
  ...hourBlock(1, 7, [{ title: 'Подъём', category: 'personal' }]),
  ...hourBlock(1, 9, [
    { title: 'Совещание', category: 'work' },
    { title: 'Контент-план', category: 'work' },
    { title: 'Перерыв на кофе', category: 'personal' },
  ]),
  ...hourBlock(1, 11, [{ title: 'Контент-план', category: 'work' }]),

  // Среда — 12:00, 4 дела (как на скрине)
  ...hourBlock(2, 7, [{ title: 'Подъём', category: 'personal' }]),
  ...hourBlock(2, 12, [
    { title: 'Позвонить в ресторан', category: 'family', description: 'В 12:00' },
    { title: 'Рекламная кампания Google', category: 'work', description: 'https://ads.google.com/...' },
    { title: 'Рекламная кампания Google', category: 'work', description: 'https://ads.google.com/...' },
    { title: 'Рекламная кампания Google', category: 'work', description: 'https://ads.google.com/...' },
  ]),
  ...hourBlock(2, 17, [{ title: 'Выход в магазин', category: 'family' }]),

  // Остальные дни
  ...hourBlock(3, 9, [{ title: 'Яндекс.Директ', category: 'work' }]),
  ...hourBlock(4, 9, [{ title: 'Отчёт за неделю', category: 'work' }]),
  ...hourBlock(5, 10, [{ title: 'Поиграть с ребёнком', category: 'family' }]),
  ...hourBlock(6, 11, [{ title: 'Повтор с ребёнком', category: 'family' }]),
];

export const SEED_WEEK_START = toLocalDateString(monday);
