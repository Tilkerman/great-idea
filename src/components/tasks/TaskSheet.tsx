import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CATEGORY_META, REMINDER_OFFSET_OPTIONS } from '../../constants/categories';
import type { TaskCategory } from '../../types';
import { getHoursRange, pad, toLocalDateString } from '../../utils/date';
import {
  getDateStrFromTask,
  getHourFromTask,
  getTasksInHour,
  MAX_TASKS_PER_HOUR,
} from '../../utils/hourSlot';
import './TaskSheet.css';

function parseLocalDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function TaskSheet() {
  const {
    sheetOpen, setSheetOpen, editingTask, setEditingTask,
    tasks, placeTask, requestDelete, settings,
  } = useApp();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>('work');
  const [important, setImportant] = useState(false);
  const [reminderOffset, setReminderOffset] = useState<number | null>(null);
  const [slotDate, setSlotDate] = useState('');
  const [slotHour, setSlotHour] = useState(0);
  const [whenOpen, setWhenOpen] = useState(false);
  const [error, setError] = useState('');
  const descRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description ?? '');
      setCategory(editingTask.category);
      setImportant(editingTask.important);
      setReminderOffset(editingTask.reminderOffsetMinutes ?? null);
      setSlotDate(getDateStrFromTask(editingTask));
      setSlotHour(getHourFromTask(editingTask));
      setWhenOpen(false);
      setError('');
    }
  }, [editingTask]);

  useEffect(() => {
    const el = descRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 36)}px`;
  }, [description, sheetOpen, editingTask]);

  const hourOptions = useMemo(() => {
    const hours = getHoursRange(settings.dayStartHour, settings.dayEndHour);
    if (!hours.includes(slotHour)) hours.push(slotHour);
    return hours.sort((a, b) => a - b);
  }, [settings.dayStartHour, settings.dayEndHour, slotHour]);

  if (!sheetOpen || !editingTask) return null;

  const isNew = !tasks.some((t) => t.id === editingTask.id);
  const targetCount = getTasksInHour(tasks, slotDate, slotHour)
    .filter((t) => t.id !== editingTask.id).length;
  const afterAdd = targetCount + 1;
  const hourFull = afterAdd > MAX_TASKS_PER_HOUR;

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
    reminderOffsetMinutes: reminderOffset,
  });

  const saveToSlot = async (status?: 'completed') => {
    if (!title.trim()) return;
    if (hourFull) {
      setError('В этом часе уже 5 дел — выберите другой час или день');
      return;
    }
    const updated = status ? { ...buildUpdated(), status } : buildUpdated();
    const result = await placeTask(updated, parseLocalDate(slotDate), slotHour);
    if (result === 'full') {
      setError('В этом часе уже 5 дел — выберите другой час или день');
      return;
    }
    close();
  };

  const del = () => {
    requestDelete(editingTask);
  };

  const slotInfo = (() => {
    if (hourFull) return 'Этот час заполнен (5/5)';
    if (afterAdd <= 1) return '1 дело на весь час (60 мин)';
    if (afterAdd <= 4) return `${afterAdd} дела × 15 мин в этом часе`;
    return `${afterAdd} дел × 12 мин в этом часе`;
  })();

  const whenLabel = slotDate
    ? `${parseLocalDate(slotDate).toLocaleDateString('ru-RU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })} · ${pad(slotHour)}:00`
    : '';

  return (
    <div className="sheet-overlay" onClick={close}>
      <div className="task-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="task-sheet__header">
          <button
            type="button"
            className="task-sheet__when-toggle"
            onClick={() => setWhenOpen((v) => !v)}
            aria-expanded={whenOpen}
          >
            <span className="task-sheet__time">{whenLabel || 'Дата и час'}</span>
            <span className="task-sheet__when-hint">{whenOpen ? 'Свернуть' : 'Изменить'}</span>
          </button>
          <button type="button" className="task-sheet__close" onClick={close} aria-label="Закрыть">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {whenOpen && (
          <div className="task-sheet__when">
            <label className="task-sheet__field task-sheet__field--inline">
              Дата
              <input
                type="date"
                className="task-sheet__select"
                value={slotDate}
                onChange={(e) => {
                  setSlotDate(e.target.value || toLocalDateString(new Date()));
                  setError('');
                }}
              />
            </label>
            <label className="task-sheet__field task-sheet__field--inline">
              Час
              <span className="select-wrap select-wrap--compact">
                <select
                  className="task-sheet__select"
                  value={slotHour}
                  onChange={(e) => {
                    setSlotHour(Number(e.target.value));
                    setError('');
                  }}
                >
                  {hourOptions.map((h) => (
                    <option key={h} value={h}>{pad(h)}:00</option>
                  ))}
                </select>
              </span>
            </label>
          </div>
        )}

        <p className="task-sheet__slot-info">{slotInfo}</p>
        {error && <p className="task-sheet__error" role="alert">{error}</p>}

        <input
          className="task-sheet__title"
          placeholder="Название задачи"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
        <textarea
          ref={descRef}
          className="task-sheet__desc"
          placeholder="Описание (необязательно)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={1}
        />

        <div className="task-sheet__categories">
          {(Object.keys(CATEGORY_META) as TaskCategory[]).map((cat) => (
            <button
              key={cat}
              type="button"
              data-cat={cat}
              className={`cat-chip ${category === cat ? 'cat-chip--active' : ''}`}
              aria-label={CATEGORY_META[cat].label}
              onClick={() => setCategory(cat)}
            >
              {CATEGORY_META[cat].label.split(' ')[0]}
            </button>
          ))}
        </div>

        <label className="task-sheet__field">
          Напомнить
          <span className="select-wrap">
            <select
              className="task-sheet__select"
              value={reminderOffset === null ? '' : String(reminderOffset)}
              onChange={(e) => {
                const v = e.target.value;
                setReminderOffset(v === '' ? null : Number(v));
              }}
            >
              {REMINDER_OFFSET_OPTIONS.map((opt) => (
                <option key={String(opt.value)} value={opt.value === null ? '' : String(opt.value)}>
                  {opt.label}
                </option>
              ))}
            </select>
          </span>
        </label>

        <label className="task-sheet__check">
          <input type="checkbox" checked={important} onChange={(e) => setImportant(e.target.checked)} />
          Важная задача
        </label>

        <div className="task-sheet__actions">
          <button type="button" className="btn btn--primary" onClick={() => { void saveToSlot(); }}>
            {isNew ? 'Создать' : 'Сохранить'}
          </button>
          {!isNew && (
            <div className="task-sheet__actions-row">
              <button type="button" className="btn btn--ghost" onClick={() => { void saveToSlot('completed'); }}>Завершить</button>
              <button type="button" className="btn btn--danger" onClick={del}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M4 7h16M9 7V5h6v2m-8 0v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Удалить
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
