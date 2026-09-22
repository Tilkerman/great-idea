// Типы для Calendar of Desires

export interface DesireImage {
  id: string;
  url: string; // base64 или URL
  order: number; // порядок отображения (0, 1, 2, ...)
}

export type LifeArea =
  | 'health'
  | 'love'
  | 'growth'
  | 'family'
  | 'home'
  | 'work'
  | 'hobby'
  | 'finance';

export interface LifeAreaRating {
  id: LifeArea;
  score: number; // 0..10
  updatedAt: string; // ISO timestamp
}

export interface Desire {
  id: string;
  title: string;
  deadline: string | null; // ISO date или null (ориентир по времени) - устаревшее, оставлено для совместимости
  imageUrl?: string | null; // base64 или URL (legacy, для обратной совместимости)
  images?: DesireImage[]; // массив изображений (до 6)
  description: string; // эмоциональное описание "Как ты хочешь себя чувствовать?"
  details: string | null; // подробное описание желания "Опиши своё желание"
  area?: LifeArea | null; // к какой сфере относится желание
  createdAt: string; // ISO date
  isActive: boolean; // желание в фокусе сегодня
  isCompleted?: boolean; // желание осуществлено/выполнено
  completedAt?: string | null; // ISO date - когда было отмечено как выполненное
}

// Контакт с желанием за день
export interface Contact {
  id: string;
  desireId: string;
  date: string; // ISO date (YYYY-MM-DD)
  type: 'entry' | 'note' | 'thought' | 'step'; // тип контакта: entry (legacy) = note (записи), мысли, шаг
  text: string | null; // текст записи или комментарий к шагу (опционально)
  createdAt: string; // ISO timestamp
  updatedAt?: string; // ISO timestamp (для отслеживания обновлений)
}

// Тип контакта для отображения
export type ContactType = 'entry' | 'note' | 'thought' | 'step';

// Обратная связь
export interface Feedback {
  id: string;
  text: string;
  rating: number | null; // 1-5 или null
  createdAt: string; // ISO timestamp
}

// Шаг действия (action item) для желания
export interface ActionItem {
  id: string;
  desireId: string;
  text: string; // текст шага
  isCompleted: boolean; // выполнено ли
  order: number; // порядок отображения
  createdAt: string; // ISO timestamp
  completedAt: string | null; // ISO timestamp - когда было отмечено как выполненное
}






