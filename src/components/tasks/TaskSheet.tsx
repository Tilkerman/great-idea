import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../../context/AppContext';
import { CATEGORY_LABEL_KEY, REMINDER_OFFSET_OPTIONS } from '../../constants/categories';
import { useI18n } from '../../i18n/useI18n';
import type { TaskCategory } from '../../types';
import { getHoursRange, pad } from '../../utils/date';
import {
  getDateStrFromTask,
  getHourFromTask,
  getTasksInHour,
  isUnscheduledTask,
  MAX_TASKS_PER_HOUR,
} from '../../utils/hourSlot';
import { enablePushFromGesture } from '../../utils/enablePush';
import { notificationsBlockedReason } from '../../utils/notifications';
import './TaskSheet.css';

function parseLocalDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

function formatSheetWhen(
  dateStr: string,
  hour: number,
  dateTag: string,
): string {
  const d = parseLocalDate(dateStr);
  const weekday = d.toLocaleDateString(dateTag, { weekday: 'short' }).replace(/\./g, '');
  const month = d.toLocaleDateString(dateTag, { month: 'short' }).replace(/\./g, '');
  return `${weekday}, ${d.getDate()} ${month} ${pad(hour)}:00`;
}

export function TaskSheet() {
  const {
    sheetOpen, setSheetOpen, editingTask, setEditingTask,
    tasks, placeTask, requestDelete, settings, updateSettings,
    taskClipboard, copyTaskToClipboard,
  } = useApp();
  const { t, dateTag } = useI18n();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>('work');
  const [important, setImportant] = useState(false);
  const [reminderOffset, setReminderOffset] = useState<number | null>(null);
  const [slotDate, setSlotDate] = useState('');
  const [slotHour, setSlotHour] = useState<number | null>(null);
  const [whenOpen, setWhenOpen] = useState(false);
  const [error, setError] = useState('');
  const [copyHint, setCopyHint] = useState('');
  const descRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description ?? '');
      setCategory(editingTask.category);
      setImportant(editingTask.important);
      setReminderOffset(editingTask.reminderOffsetMinutes ?? null);
      if (isUnscheduledTask(editingTask)) {
        setSlotDate('');
        setSlotHour(null);
        setWhenOpen(true);
      } else {
        setSlotDate(getDateStrFromTask(editingTask));
        setSlotHour(getHourFromTask(editingTask));
        setWhenOpen(false);
      }
      setError('');
      setCopyHint('');
    }
  }, [editingTask]);

  useEffect(() => {
    const el = descRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 36)}px`;
  }, [description, sheetOpen, editingTask]);

  useEffect(() => {
    if (!sheetOpen || !editingTask) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sheetOpen, editingTask]);

  const hourOptions = useMemo(() => {
    const hours = getHoursRange(settings.dayStartHour, settings.dayEndHour);
    if (slotHour !== null && !hours.includes(slotHour)) hours.push(slotHour);
    return hours.sort((a, b) => a - b);
  }, [settings.dayStartHour, settings.dayEndHour, slotHour]);

  if (!sheetOpen || !editingTask) return null;

  const isNew = !tasks.some((t) => t.id === editingTask.id);
  const isCompleted = editingTask.status === 'completed';
  const showClipActions = isNew || !isCompleted;
  const canCopy = !isNew && title.trim().length > 0;
  const canPaste = isNew && taskClipboard !== null;
  const slotPicked = Boolean(slotDate) && slotHour !== null;
  const targetCount = slotPicked
    ? getTasksInHour(tasks, slotDate, slotHour).filter((t) => t.id !== editingTask.id).length
    : 0;
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
    if (!slotPicked || slotHour === null) {
      setWhenOpen(true);
      setError(t('sheetPickWhen'));
      return;
    }
    if (hourFull) {
      setError(t('sheetHourFull'));
      return;
    }
    const updated = status ? { ...buildUpdated(), status } : buildUpdated();
    const result = await placeTask(updated, parseLocalDate(slotDate), slotHour);
    if (result === 'full') {
      setError(t('sheetHourFull'));
      return;
    }
    close();
  };

  const del = () => {
    requestDelete(editingTask);
  };

  const copyTask = () => {
    if (!canCopy) return;
    const data = buildUpdated();
    copyTaskToClipboard({
      title: data.title,
      description: data.description,
      category: data.category,
      important: data.important,
      reminderOffsetMinutes: data.reminderOffsetMinutes ?? null,
    });
    setCopyHint(t('sheetCopied'));
    window.setTimeout(() => setCopyHint(''), 1600);
  };

  const pasteTask = () => {
    if (!canPaste || !taskClipboard) return;
    setTitle(taskClipboard.title);
    setDescription(taskClipboard.description ?? '');
    setCategory(taskClipboard.category);
    setImportant(taskClipboard.important);
    setReminderOffset(taskClipboard.reminderOffsetMinutes);
    setError('');
  };

  const slotInfo = (() => {
    if (!slotPicked) return t('sheetPickWhenHint');
    if (hourFull) return t('sheetHourFullHint');
    if (afterAdd <= 1) return t('sheetOneHour');
    if (afterAdd <= 4) return t('sheetN15', { n: afterAdd });
    return t('sheetN12', { n: afterAdd });
  })();

  const whenLabel = slotPicked && slotHour !== null
    ? formatSheetWhen(slotDate, slotHour, dateTag)
    : t('sheetWhenMissing');

  return createPortal(
    <div className="sheet-overlay" onClick={close}>
      <div className="task-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="task-sheet__header">
          <span className="task-sheet__time">{whenLabel || t('sheetWhenFallback')}</span>
          <div className="task-sheet__tools">
            <button
              type="button"
              className="task-sheet__link"
              onClick={() => setWhenOpen((v) => !v)}
              aria-expanded={whenOpen}
            >
              {whenOpen ? t('sheetCollapse') : (slotPicked ? t('sheetEdit') : t('sheetSet'))}
            </button>
            {showClipActions && (
              <>
                <button
                  type="button"
                  className="task-sheet__link"
                  disabled={!canCopy}
                  onClick={copyTask}
                >
                  {copyHint || t('sheetCopy')}
                </button>
                <button
                  type="button"
                  className={`task-sheet__link ${canPaste ? 'task-sheet__link--active' : ''}`}
                  disabled={!canPaste}
                  onClick={pasteTask}
                >
                  {t('sheetPaste')}
                </button>
              </>
            )}
          </div>
          <button type="button" className="task-sheet__close" onClick={close} aria-label={t('close')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {whenOpen && (
          <div className="task-sheet__when">
            <label className="task-sheet__field task-sheet__field--inline">
              {t('sheetDate')}
              <span className="task-sheet__date-wrap">
                <input
                  type="date"
                  className="task-sheet__select"
                  value={slotDate}
                  onChange={(e) => {
                    setSlotDate(e.target.value);
                    setError('');
                  }}
                />
              </span>
            </label>
            <label className="task-sheet__field task-sheet__field--inline">
              {t('sheetHour')}
              <span className="select-wrap select-wrap--compact">
                <select
                  className="task-sheet__select"
                  value={slotHour === null ? '' : String(slotHour)}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSlotHour(v === '' ? null : Number(v));
                    setError('');
                  }}
                >
                  <option value="">{t('sheetHour')}</option>
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
          placeholder={t('sheetTitlePh')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
        <textarea
          ref={descRef}
          className="task-sheet__desc"
          placeholder={t('sheetDescPh')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={1}
        />

        <div className="task-sheet__categories">
          {(Object.keys(CATEGORY_LABEL_KEY) as TaskCategory[]).map((cat) => (
            <button
              key={cat}
              type="button"
              data-cat={cat}
              className={`cat-chip ${category === cat ? 'cat-chip--active' : ''}`}
              aria-label={t(CATEGORY_LABEL_KEY[cat])}
              onClick={() => setCategory(cat)}
            >
              {t(CATEGORY_LABEL_KEY[cat]).split(' ')[0]}
            </button>
          ))}
        </div>

        <label className="task-sheet__field">
          {t('sheetRemind')}
          <span className="select-wrap">
            <select
              className="task-sheet__select"
              value={reminderOffset === null ? '' : String(reminderOffset)}
              onChange={(e) => {
                const v = e.target.value;
                const next = v === '' ? null : Number(v);
                setReminderOffset(next);
                if (next === null) return;
                void enablePushFromGesture().then((result) => {
                  if (result === 'granted') {
                    void updateSettings({ notificationsEnabled: true });
                    return;
                  }
                  if (result === 'blocked') {
                    setError(notificationsBlockedReason(settings.locale) ?? t('sheetNotifyBlocked'));
                    return;
                  }
                  if (result === 'denied') {
                    setError(t('sheetNotifyDenied'));
                  }
                });
              }}
            >
              {REMINDER_OFFSET_OPTIONS.map((opt) => (
                <option key={String(opt.value)} value={opt.value === null ? '' : String(opt.value)}>
                  {t(opt.labelKey)}
                </option>
              ))}
            </select>
          </span>
        </label>

        <label className="task-sheet__check">
          <input type="checkbox" checked={important} onChange={(e) => setImportant(e.target.checked)} />
          {t('sheetImportant')}
        </label>

        <div className="task-sheet__actions">
          <button
            type="button"
            className="btn btn--primary"
            disabled={!title.trim() || !slotPicked}
            onClick={() => { void saveToSlot(); }}
          >
            {isNew ? t('create') : t('save')}
          </button>
          {!isNew && (
            <div className="task-sheet__actions-row">
              <button type="button" className="btn btn--ghost" onClick={() => { void saveToSlot('completed'); }}>{t('complete')}</button>
              <button type="button" className="btn btn--danger" onClick={del}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M4 7h16M9 7V5h6v2m-8 0v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t('delete')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
