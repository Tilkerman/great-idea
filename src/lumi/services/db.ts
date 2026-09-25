import Dexie, { type Table } from 'dexie';
import type { Desire, Contact, ContactType, LifeArea, LifeAreaRating, Feedback, ActionItem } from '../types';
import { getTodayDateString, toLocalDateString } from '../utils/date';
import { newTaskId } from '../../utils/id';

class CalendarOfDesiresDB extends Dexie {
  desires!: Table<Desire>;
  contacts!: Table<Contact>;
  lifeAreas!: Table<LifeAreaRating>;
  feedbacks!: Table<Feedback>;
  actionItems!: Table<ActionItem>;

  constructor() {
    super('tili-lumi-desires');
    this.version(2).stores({
      desires: 'id, isActive, createdAt',
      contacts: 'id, desireId, date, type, [desireId+date], createdAt',
    });
    // Версия 3: добавляем составной индекс [desireId+date+type] для оптимизации запросов
    this.version(3).stores({
      desires: 'id, isActive, createdAt',
      contacts: 'id, desireId, date, type, [desireId+date], [desireId+date+type], createdAt',
    });

    // Версия 4: добавляем сферу (area) для желаний и таблицу оценок по сферам (lifeAreas)
    this.version(4)
      .stores({
        desires: 'id, isActive, createdAt, area',
        contacts: 'id, desireId, date, type, [desireId+date], [desireId+date+type], createdAt',
        lifeAreas: 'id',
      })
      .upgrade(async (tx) => {
        // Инициализируем 8 сфер значениями 0..10
        const areas: LifeArea[] = [
          'health',
          'love',
          'growth',
          'family',
          'home',
          'work',
          'hobby',
          'finance',
        ];
        const now = new Date().toISOString();
        await tx.table('lifeAreas').bulkPut(
          areas.map((id) => ({ id, score: 0, updatedAt: now }))
        );
      });

    // Версия 5: добавляем таблицу для обратной связи
    this.version(5)
      .stores({
        desires: 'id, isActive, createdAt, area',
        contacts: 'id, desireId, date, type, [desireId+date], [desireId+date+type], createdAt',
        lifeAreas: 'id',
        feedbacks: 'id, createdAt',
      });

    // Версия 6: добавляем поля isCompleted и completedAt для желаний
    this.version(6)
      .stores({
        desires: 'id, isActive, isCompleted, createdAt, area',
        contacts: 'id, desireId, date, type, [desireId+date], [desireId+date+type], createdAt',
        lifeAreas: 'id',
        feedbacks: 'id, createdAt',
      });

    // Версия 7: добавляем таблицу actionItems (шаги действий)
    this.version(7)
      .stores({
        desires: 'id, isActive, isCompleted, createdAt, area',
        contacts: 'id, desireId, date, type, [desireId+date], [desireId+date+type], createdAt',
        lifeAreas: 'id',
        feedbacks: 'id, createdAt',
        actionItems: 'id, desireId, order, [desireId+order], createdAt',
      });

    this.version(8).stores({
      desires: 'id, isActive, isCompleted, createdAt, area',
      contacts: 'id, desireId, date, type, [desireId+date], [desireId+date+type], createdAt',
      lifeAreas: 'id',
      feedbacks: 'id, createdAt',
      actionItems: 'id, desireId, order, linkedTaskId, [desireId+order], createdAt',
    });
  }
}

const db = new CalendarOfDesiresDB();

// Проверка инициализации базы данных
db.open()
  .then(() => {
    console.log('✅ База данных открыта успешно');
  })
  .catch((err) => {
    console.error('❌ Ошибка открытия базы данных:', err);
  });

// Методы для работы с желаниями
export const desireService = {
  async getActiveDesire(): Promise<Desire | undefined> {
    try {
      await db.open();
      return await db.desires.filter((d) => d.isActive === true).first();
    } catch (error) {
      console.error('Ошибка при получении активного желания:', error);
      return undefined;
    }
  },

  async getDesireById(id: string): Promise<Desire | undefined> {
    try {
      await db.open();
      return await db.desires.get(id);
    } catch (error) {
      console.error('Ошибка при получении желания:', error);
      return undefined;
    }
  },

  async createDesire(desire: Omit<Desire, 'id' | 'createdAt'>): Promise<string> {
    try {
      await db.open();
      const newDesire: Desire = {
        ...desire,
        details: desire.details || null, // Поддержка нового поля
        area: desire.area ?? null,
        isCompleted: desire.isCompleted ?? false,
        completedAt: desire.completedAt ?? null,
        id: newTaskId(),
        createdAt: new Date().toISOString(),
      };

      await db.desires.add(newDesire);
      return newDesire.id;
    } catch (error) {
      console.error('Ошибка при создании желания:', error);
      throw error;
    }
  },

  async updateDesire(id: string, updates: Partial<Desire>): Promise<void> {
    try {
      await db.open();
      // Используем modify для гарантированного обновления всех полей, включая массивы
      await db.desires.where('id').equals(id).modify(updates);
    } catch (error) {
      console.error('Ошибка при обновлении желания:', error);
      throw error;
    }
  },

  async deleteDesire(id: string): Promise<void> {
    const { unlinkTasksForDesire } = await import('../../utils/wishTaskBridge');
    await unlinkTasksForDesire(id);
    await db.desires.delete(id);
    await db.contacts.where('desireId').equals(id).delete();
    await actionItemService.deleteActionItemsByDesire(id);
  },

  async getAllDesires(includeCompleted: boolean = false): Promise<Desire[]> {
    try {
      await db.open();
      const all = await db.desires.orderBy('createdAt').reverse().toArray();
      if (includeCompleted) {
        return all;
      }
      return all.filter((d) => !d.isCompleted);
    } catch (error) {
      console.error('Ошибка при получении всех желаний:', error);
      return [];
    }
  },

  async getCompletedDesires(): Promise<Desire[]> {
    try {
      await db.open();
      const completed = await db.desires
        .filter((d) => d.isCompleted === true)
        .toArray();
      // Сортируем по completedAt (если есть) или createdAt
      return completed.sort((a, b) => {
        const aDate = a.completedAt || a.createdAt;
        const bDate = b.completedAt || b.createdAt;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });
    } catch (error) {
      console.error('Ошибка при получении выполненных желаний:', error);
      return [];
    }
  },

  async markAsCompleted(id: string): Promise<void> {
    try {
      await db.open();
      await db.desires.where('id').equals(id).modify({
        isCompleted: true,
        completedAt: new Date().toISOString(),
        isActive: false, // Снимаем фокус с выполненного желания
      });
    } catch (error) {
      console.error('Ошибка при пометке желания как выполненного:', error);
      throw error;
    }
  },

  async setFocusDesire(id: string): Promise<void> {
    try {
      await db.open();
      // Деактивируем все желания
      await db.desires.filter((d) => d.isActive === true).modify({ isActive: false });
      // Активируем выбранное
      await db.desires.update(id, { isActive: true });
    } catch (error) {
      console.error('Ошибка при установке фокуса на желание:', error);
      throw error;
    }
  },

  async getCountsByArea(areas: LifeArea[]): Promise<Record<LifeArea, number>> {
    await db.open();
    const result = {} as Record<LifeArea, number>;
    await Promise.all(
      areas.map(async (a) => {
        const count = await db.desires
          .where('area')
          .equals(a as any)
          .filter((d) => !d.isCompleted)
          .count();
        result[a] = count;
      })
    );
    return result;
  },
};

export const lifeAreaService = {
  async getAll(): Promise<Record<LifeArea, number>> {
    await db.open();
    const rows = await db.lifeAreas.toArray();
    const result = {} as Record<LifeArea, number>;
    for (const r of rows) {
      result[r.id] = r.score;
    }
    return result;
  },

  async setScore(area: LifeArea, score: number): Promise<void> {
    await db.open();
    await db.lifeAreas.put({ id: area, score, updatedAt: new Date().toISOString() });
  },
};

// Методы для работы с контактами
export const contactService = {
  // Сводка по последним 7 дням: для каждого дня возвращаем какие типы контактов были
  async getLast7DaysSummary(
    desireId: string
  ): Promise<Array<{ date: string; types: Array<'entry' | 'thought' | 'step'> }>> {
    try {
      await db.open();

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dates: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        dates.push(toLocalDateString(d)); // oldest -> newest (today last)
      }

      const start = dates[0];
      const end = dates[dates.length - 1];

      // Берём контакты только в диапазоне последних 7 дней через индекс [desireId+date]
      const contactsLast7 = await db.contacts
        .where('[desireId+date]')
        .between([desireId, start], [desireId, end], true, true)
        .toArray();

      const byDate = new Map<string, Set<'entry' | 'thought' | 'step'>>();
      for (const dateStr of dates) {
        byDate.set(dateStr, new Set());
      }

      for (const c of contactsLast7) {
        const set = byDate.get(c.date);
        if (!set) continue;
        // В базе 'note' хранится как 'entry'
        const normalized = (c.type === 'note' ? 'entry' : c.type) as 'entry' | 'thought' | 'step';
        if (normalized === 'entry' || normalized === 'thought' || normalized === 'step') {
          set.add(normalized);
        }
      }

      return dates.map((date) => ({ date, types: Array.from(byDate.get(date) ?? []) }));
    } catch (error) {
      console.error('Ошибка при получении сводки контактов за 7 дней:', error);
      // Фолбэк: 7 пустых дней (today last)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dates: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        dates.push(toLocalDateString(d));
      }
      return dates.map((date) => ({ date, types: [] }));
    }
  },

  // Получить контакт определенного типа за сегодня
  // Поддержка 'note' как алиаса для 'entry' для обратной совместимости
  async getTodayContact(desireId: string, type: ContactType): Promise<Contact | undefined> {
    const today = getTodayDateString(); // YYYY-MM-DD (локальная дата)
    // 'note' и 'entry' - это одно и то же
    const normalizedType = type === 'note' ? 'entry' : type;
    return await db.contacts
      .where('[desireId+date+type]')
      .equals([desireId, today, normalizedType])
      .first();
  },

  // Получить все контакты определенного типа за сегодня
  async getTodayContacts(desireId: string): Promise<Contact[]> {
    const today = getTodayDateString();
    return await db.contacts
      .where('[desireId+date]')
      .equals([desireId, today])
      .toArray();
  },

  // Создать или обновить контакт за сегодня
  async createOrUpdateContact(
    desireId: string,
    type: ContactType,
    text: string | null = null
  ): Promise<string> {
    const today = getTodayDateString();
    // 'note' и 'entry' - это одно и то же, используем 'entry' в базе
    const normalizedType = type === 'note' ? 'entry' : type;
    
    // Проверяем, есть ли уже контакт этого типа за сегодня
    const existing = await this.getTodayContact(desireId, type);
    
    let contactId: string;
    if (existing) {
      // Обновляем существующий
      await db.contacts.update(existing.id, {
        text,
        updatedAt: new Date().toISOString(),
      });
      contactId = existing.id;
    } else {
      // Создаем новый
      const newContact: Contact = {
        id: newTaskId(),
        desireId,
        date: today,
        type: normalizedType,
        text,
        createdAt: new Date().toISOString(),
      };
      await db.contacts.add(newContact);
      contactId = newContact.id;
    }

    // Автоматически устанавливаем желание "в фокусе" при создании контакта (если время до 23:00)
    // Может быть несколько желаний в фокусе одновременно
    const now = new Date();
    const currentHour = now.getHours();
    if (currentHour < 23) {
      await db.desires.update(desireId, { isActive: true });
    }

    return contactId;
  },

  // Получить количество дней с контактом определенного типа за последние 7 дней
  async getContactDaysLast7Days(desireId: string, type: ContactType): Promise<number> {
    try {
      await db.open();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const datesWithContact = new Set<string>();

      // Получаем все контакты этого типа за последние 7 дней
      const allContacts = await db.contacts
        .where('desireId')
        .equals(desireId)
        .toArray();
      
      // Фильтруем по типу (поддержка 'note' как алиаса для 'entry')
      const normalizedType = type === 'note' ? 'entry' : type;
      const filteredContacts = allContacts.filter((c) => c.type === normalizedType || (type === 'note' && c.type === 'entry'));

      // Проверяем каждый из последних 7 дней
      for (let i = 0; i < 7; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        const dateStr = toLocalDateString(checkDate);

        // Проверяем, есть ли контакт этого типа в этот день
        const hasContact = filteredContacts.some((contact) => contact.date === dateStr);
        
        if (hasContact) {
          datesWithContact.add(dateStr);
        }
      }

      return datesWithContact.size;
    } catch (error) {
      console.error('Ошибка при подсчете контактов:', error);
      return 0;
    }
  },

  // Получить количество дней с любым контактом за последние 7 дней
  // Контакт засчитывается, если в день был хотя бы один контакт (entry, thought или step)
  async getTotalContactDaysLast7Days(desireId: string): Promise<number> {
    try {
      await db.open();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const datesWithContact = new Set<string>();

      // Получаем все контакты желания
      const allContacts = await db.contacts
        .where('desireId')
        .equals(desireId)
        .toArray();

      // Проверяем каждый из последних 7 дней
      for (let i = 0; i < 7; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        const dateStr = toLocalDateString(checkDate);

        // Проверяем, есть ли хотя бы один контакт (любого типа) в этот день
        const hasContact = allContacts.some((contact) => contact.date === dateStr);
        
        if (hasContact) {
          datesWithContact.add(dateStr);
        }
      }

      return datesWithContact.size;
    } catch (error) {
      console.error('Ошибка при подсчете контактов:', error);
      return 0;
    }
  },

  // Получить все контакты желания
  async getAllContacts(desireId: string): Promise<Contact[]> {
    const contacts = await db.contacts
      .where('desireId')
      .equals(desireId)
      .toArray();

    // Сортируем вручную по дате (новые сверху)
    contacts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return contacts;
  },

  // Получить контакты определенного типа
  async getContactsByType(desireId: string, type: ContactType): Promise<Contact[]> {
    const contacts = await db.contacts
      .where('desireId')
      .equals(desireId)
      .toArray();

    // Поддержка 'note' как алиаса для 'entry'
    const normalizedType = type === 'note' ? 'entry' : type;
    const filtered = contacts.filter((c) => c.type === normalizedType || (type === 'note' && c.type === 'entry'));
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return filtered;
  },

  // Удалить контакт
  async deleteContact(id: string): Promise<void> {
    await db.contacts.delete(id);
  },

  // Получить статистику контактов для желания
  async getStatistics(desireId: string): Promise<{
    entryCount: number; // количество записей
    thoughtCount: number; // количество мыслей
    stepCount: number; // количество шагов
  }> {
    const allContacts = await db.contacts
      .where('desireId')
      .equals(desireId)
      .toArray();

    const entryCount = allContacts.filter((c) => c.type === 'entry' || c.type === 'note').length;
    const thoughtCount = allContacts.filter((c) => c.type === 'thought').length;
    const stepCount = allContacts.filter((c) => c.type === 'step').length;

    return {
      entryCount,
      thoughtCount,
      stepCount,
    };
  },
};

// Сервис для работы с обратной связью
export const feedbackService = {
  // Сохранить обратную связь
  async saveFeedback(text: string, rating: number | null): Promise<string> {
    const id = `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const feedback: Feedback = {
      id,
      text,
      rating,
      createdAt: new Date().toISOString(),
    };
    await db.feedbacks.add(feedback);
    return id;
  },

  // Получить все обратные связи (от новых к старым)
  async getAllFeedbacks(): Promise<Feedback[]> {
    const feedbacks = await db.feedbacks.orderBy('createdAt').reverse().toArray();
    return feedbacks;
  },

  // Удалить обратную связь
  async deleteFeedback(id: string): Promise<void> {
    await db.feedbacks.delete(id);
  },
};

// Сервис для работы с шагами действий (action items)
export const actionItemService = {
  // Получить все шаги для желания (отсортированные по order)
  async getActionItemsByDesire(desireId: string): Promise<ActionItem[]> {
    try {
      await db.open();
      const items = await db.actionItems
        .where('desireId')
        .equals(desireId)
        .sortBy('order');
      return items;
    } catch (error) {
      console.error('Ошибка при получении шагов:', error);
      return [];
    }
  },

  async getActionItem(id: string): Promise<ActionItem | undefined> {
    try {
      await db.open();
      return db.actionItems.get(id);
    } catch (error) {
      console.error('Ошибка при получении шага:', error);
      return undefined;
    }
  },

  async getByLinkedTaskId(taskId: string): Promise<ActionItem | undefined> {
    try {
      await db.open();
      return db.actionItems.where('linkedTaskId').equals(taskId).first();
    } catch (error) {
      console.error('Ошибка при поиске шага по задаче:', error);
      return undefined;
    }
  },

  // Создать новый шаг
  async createActionItem(desireId: string, text: string, order?: number): Promise<string> {
    try {
      await db.open();
      
      // Если order не указан, добавляем в конец
      if (order === undefined) {
        const existing = await this.getActionItemsByDesire(desireId);
        order = existing.length;
      }

      const newItem: ActionItem = {
        id: newTaskId(),
        desireId,
        text: text.trim(),
        isCompleted: false,
        order,
        createdAt: new Date().toISOString(),
        completedAt: null,
        linkedTaskId: null,
      };

      await db.actionItems.add(newItem);
      return newItem.id;
    } catch (error) {
      console.error('Ошибка при создании шага:', error);
      throw error;
    }
  },

  // Обновить шаг
  async updateActionItem(id: string, updates: Partial<ActionItem>): Promise<void> {
    try {
      await db.open();
      await db.actionItems.update(id, updates);
    } catch (error) {
      console.error('Ошибка при обновлении шага:', error);
      throw error;
    }
  },

  // Отметить шаг как выполненный/невыполненный
  async toggleActionItem(id: string): Promise<void> {
    try {
      await db.open();
      const item = await db.actionItems.get(id);
      if (!item) return;

      const isCompleted = !item.isCompleted;
      await db.actionItems.update(id, {
        isCompleted,
        completedAt: isCompleted ? new Date().toISOString() : null,
      });
    } catch (error) {
      console.error('Ошибка при переключении статуса шага:', error);
      throw error;
    }
  },

  // Удалить шаг
  async deleteActionItem(id: string): Promise<void> {
    try {
      await db.open();
      const item = await db.actionItems.get(id);
      if (!item) return;
      
      const desireId = item.desireId;
      if (item.linkedTaskId) {
        const { clearLumiFieldsOnTask } = await import('../../utils/wishTaskUnlink');
        await clearLumiFieldsOnTask(item.linkedTaskId);
      }
      await db.actionItems.delete(id);
      
      // Пересчитываем порядок оставшихся шагов
      const remainingItems = await this.getActionItemsByDesire(desireId);
      await Promise.all(
        remainingItems.map((it, index) =>
          db.actionItems.update(it.id, { order: index })
        )
      );
    } catch (error) {
      console.error('Ошибка при удалении шага:', error);
      throw error;
    }
  },

  // Удалить все шаги для желания
  async deleteActionItemsByDesire(desireId: string): Promise<void> {
    try {
      await db.open();
      await db.actionItems.where('desireId').equals(desireId).delete();
    } catch (error) {
      console.error('Ошибка при удалении шагов:', error);
      throw error;
    }
  },

  // Переупорядочить шаги
  async reorderActionItems(_desireId: string, itemIds: string[]): Promise<void> {
    try {
      await db.open();
      await Promise.all(
        itemIds.map((id, index) =>
          db.actionItems.update(id, { order: index })
        )
      );
    } catch (error) {
      console.error('Ошибка при переупорядочивании шагов:', error);
      throw error;
    }
  },

  // Проверить, все ли шаги выполнены
  async areAllActionItemsCompleted(desireId: string): Promise<boolean> {
    try {
      await db.open();
      const items = await this.getActionItemsByDesire(desireId);
      if (items.length === 0) return false;
      return items.every((item) => item.isCompleted);
    } catch (error) {
      console.error('Ошибка при проверке шагов:', error);
      return false;
    }
  },
};

export { db };
