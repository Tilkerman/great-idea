import { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CATEGORY_META } from '../../constants/categories';
import type { TaskCategory } from '../../types';
import { formatTime } from '../../utils/date';
import {
  getDateStrFromTask,
  getHourFromTask,
  getTasksInHour,
} from '../../utils/hourSlot';
import './TaskSheet.css';

export function TaskSheet() {
  const {
    sheetOpen, setSheetOpen, editingTask, setEditingTask,
    tasks, saveHourSlot, deleteTaskInHour,
  } = useApp();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>('work');
  const [important, setImportant] = useState(false);

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description ?? '');
      setCategory(editingTask.category);
      setImportant(editingTask.important);
    }
  }, [editingTask]);

  if (!sheetOpen || !editingTask) return null;

  const start = new Date(editingTask.startAt);
  const end = new Date(editingTask.endAt);
  const isNew = !tasks.some((t) => t.id === editingTask.id);

  const close = () => {
    setSheetOpen(false);
    setEditingTask(null);
  };

  const buildUpdated = () => ({
    ...editingTask,
    title: title.trim(),
    description: description.trim() || undefined,
    category,
    important,
  });

  const save = async () => {
    if (!title.trim()) return;
    const updated = buildUpdated();
    const day = new Date(editingTask.startAt);
    const hour = getHourFromTask(editingTask);
    const dateStr = getDateStrFromTask(editingTask);
    const inHour = getTasksInHour(tasks, dateStr, hour);
    const merged = inHour.some((t) => t.id === updated.id)
      ? inHour.map((t) => (t.id === updated.id ? updated : t))
      : [...inHour, updated];
    await saveHourSlot(day, hour, merged);
    close();
  };

  const complete = async () => {
    const updated = { ...buildUpdated(), status: 'completed' as const };
    const day = new Date(editingTask.startAt);
    const hour = getHourFromTask(editingTask);
    const dateStr = getDateStrFromTask(editingTask);
    const inHour = getTasksInHour(tasks, dateStr, hour)
      .map((t) => (t.id === updated.id ? updated : t));
    await saveHourSlot(day, hour, inHour);
    close();
  };

  const del = async () => {
    if (editingTask.title || tasks.some((t) => t.id === editingTask.id)) {
      await deleteTaskInHour(editingTask);
    }
    close();
  };

  const slotInfo = (() => {
    const dateStr = getDateStrFromTask(editingTask);
    const hour = getHourFromTask(editingTask);
    const count = getTasksInHour(tasks, dateStr, hour).length;
    const afterAdd = isNew ? count + 1 : count;
    if (afterAdd <= 1) return '1 дело на весь час (60 мин)';
    if (afterAdd <= 4) return `${afterAdd} дела × 15 мин в этом часе`;
    return `${afterAdd} дел × 12 мин в этом часе`;
  })();

  return (
    <div className="sheet-overlay" onClick={close}>
      <div className="task-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="task-sheet__header">
          <span className="task-sheet__time">
            {start.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'short' })}
            {' · '}
            {formatTime(start)} – {formatTime(end)}
          </span>
          <button type="button" className="task-sheet__close" onClick={close}>×</button>
        </div>

        <p className="task-sheet__slot-info">{slotInfo}</p>

        <input
          className="task-sheet__title"
          placeholder="Название задачи"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
        <textarea
          className="task-sheet__desc"
          placeholder="Описание (необязательно)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />

        <div className="task-sheet__categories">
          {(Object.keys(CATEGORY_META) as TaskCategory[]).map((cat) => (
            <button
              key={cat}
              type="button"
              className={`cat-chip ${category === cat ? 'cat-chip--active' : ''}`}
              style={{ background: CATEGORY_META[cat].bg, color: CATEGORY_META[cat].text }}
              onClick={() => setCategory(cat)}
            >
              {CATEGORY_META[cat].label}
            </button>
          ))}
        </div>

        <label className="task-sheet__check">
          <input type="checkbox" checked={important} onChange={(e) => setImportant(e.target.checked)} />
          Важная задача
        </label>

        <div className="task-sheet__actions">
          {!isNew && (
            <>
              <button type="button" className="btn btn--ghost" onClick={complete}>Завершить</button>
              <button type="button" className="btn btn--danger" onClick={del}>Удалить</button>
            </>
          )}
          <button type="button" className="btn btn--primary" onClick={save}>
            {isNew ? 'Создать' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}
