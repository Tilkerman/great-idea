import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../../context/AppContext';
import { CATEGORY_LABEL_KEY, REMINDER_OFFSET_OPTIONS } from '../../constants/categories';
import { useI18n } from '../../i18n/useI18n';
import type { TaskCategory } from '../../types';
import { getHoursRange, isLockedCreateDay, pad, toLocalDateString } from '../../utils/date';
import {
  getDateStrFromTask,
  getHourFromTask,
  getTasksInHour,
  isUnscheduledTask,
  MAX_TASKS_PER_HOUR,
} from '../../utils/hourSlot';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import {
  markFirstReminderHintSeen,
  shouldShowFirstReminderHint,
} from '../../utils/reminderNoticeHint';
import { useLumiHost } from '../../lumi/LumiHost';
import { taskHasLumiLink } from '../../utils/wishTaskBridge';
import { useLayoutMode } from '../../hooks/useLayoutMode';
import { enablePushFromGesture } from '../../utils/enablePush';
import { refreshCloudReminders } from '../../utils/webPush';
import {
  REPEAT_WEEKDAY_ORDER,
  REPEAT_WEEKDAYS_MON_FRI,
  formatRepeatDaysLabel,
  isRepeatOn,
  isWeekdaysMonFri,
  normalizeRepeatWeekdays,
  toggleRepeatWeekday,
} from '../../utils/taskRepeat';
import './TaskSheet.css';

function BellRowIcon() {
  return (
    <svg className="task-sheet__choice-svg" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
        strokeLinecap="round"
        d="M6.2 16.8h11.6c.55 0 .85-.62.5-1.07l-1.35-1.75V11c0-2.55-1.7-4.72-4.15-5.4V4.55a1.8 1.8 0 0 0-3.6 0v1.05C6.75 6.28 5.05 8.45 5.05 11v2.98L3.7 15.73c-.35.45-.05 1.07.5 1.07Z"
      />
      <path fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" d="M10 19.15a2 2 0 0 0 4 0" />
    </svg>
  );
}

function RepeatRowIcon() {
  return (
    <svg className="task-sheet__choice-svg" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 1v4h-4M7 23v-4h4M20.5 8.5A8 8 0 0 0 7.2 5.1L7 5M3.5 15.5A8 8 0 0 0 16.8 18.9L17 19"
      />
    </svg>
  );
}

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
    tasks, placeTaskWithRepeat, requestDelete, settings, updateSettings,
    taskClipboard, copyTaskToClipboard, setScreen,
  } = useApp();
  const { t, dateTag, weekdaysShort } = useI18n();
  const { requestOpenDesire } = useLumiHost();
  const { isDesktopLayout } = useLayoutMode();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>('work');
  const [important, setImportant] = useState(false);
  const [reminderOffset, setReminderOffset] = useState<number | null>(null);
  const [slotDate, setSlotDate] = useState('');
  const [slotHour, setSlotHour] = useState<number | null>(null);
  const [whenOpen, setWhenOpen] = useState(false);
  const [error, setError] = useState('');
  const [repeatWeekdays, setRepeatWeekdays] = useState<number[]>([]);
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [repeatDraft, setRepeatDraft] = useState<number[]>([]);
  const [remindOpen, setRemindOpen] = useState(false);
  const [remindDraft, setRemindDraft] = useState<number | null>(null);
  const [reminderHintOpen, setReminderHintOpen] = useState(false);
  const [copyHint, setCopyHint] = useState('');
  const descRef = useRef<HTMLTextAreaElement>(null);
  const popOpenedAt = useRef(0);

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description ?? '');
      setCategory(editingTask.category);
      setImportant(editingTask.important);
      setReminderOffset(editingTask.reminderOffsetMinutes ?? null);
      setRepeatWeekdays(normalizeRepeatWeekdays(editingTask.repeatWeekdays));
      setRepeatOpen(false);
      setRemindOpen(false);
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
    if (!sheetOpen || !editingTask || isDesktopLayout) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sheetOpen, editingTask, isDesktopLayout]);

  useEffect(() => {
    if (!sheetOpen || !isDesktopLayout) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (repeatOpen || remindOpen) {
        setRepeatOpen(false);
        setRemindOpen(false);
        return;
      }
      setSheetOpen(false);
      setEditingTask(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheetOpen, isDesktopLayout, repeatOpen, remindOpen, setEditingTask, setSheetOpen]);

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
  const todayStr = toLocalDateString(new Date());
  const slotDay = slotDate ? parseLocalDate(slotDate) : null;
  const originalDate = isUnscheduledTask(editingTask) ? '' : getDateStrFromTask(editingTask);
  const blockedPast = Boolean(
    slotDay
    && isLockedCreateDay(slotDay)
    && (isNew || originalDate !== slotDate),
  );

  const close = () => {
    setRepeatOpen(false);
    setRemindOpen(false);
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
    repeatWeekdays: isRepeatOn(repeatWeekdays) ? repeatWeekdays : null,
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
    if (blockedPast) {
      setError(t('sheetNoPastDay'));
      return;
    }
    const updated = status ? { ...buildUpdated(), status } : buildUpdated();
    const result = await placeTaskWithRepeat(
      updated,
      parseLocalDate(slotDate),
      slotHour,
      isRepeatOn(repeatWeekdays) ? repeatWeekdays : [],
    );
    if (result === 'full') {
      setError(t('sheetHourFull'));
      return;
    }
    if (result === 'past') {
      setError(t('sheetNoPastDay'));
      return;
    }
    if (updated.reminderOffsetMinutes != null) {
      void enablePushFromGesture().then(async (push) => {
        if (push === 'denied' || push === 'dismissed' || push === 'blocked' || push === 'unsupported') {
          return;
        }
        await updateSettings({ notificationsEnabled: true });
        await refreshCloudReminders(settings.locale);
      });
    }
    close();
  };

  const onSubmitSheet = (e: FormEvent) => {
    e.preventDefault();
    void saveToSlot();
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
      repeatWeekdays: data.repeatWeekdays ?? null,
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
    setRepeatWeekdays(normalizeRepeatWeekdays(taskClipboard.repeatWeekdays));
    setError('');
  };

  const slotInfo = (() => {
    if (!slotPicked) return t('sheetPickWhenHint');
    if (hourFull) return t('sheetHourFullHint');
    if (blockedPast) return t('sheetNoPastDay');
    if (afterAdd <= 1) return t('sheetOneHour');
    if (afterAdd <= 4) return t('sheetN15', { n: afterAdd });
    return t('sheetN12', { n: afterAdd });
  })();

  const whenLabel = slotPicked && slotHour !== null
    ? formatSheetWhen(slotDate, slotHour, dateTag)
    : t('sheetWhenMissing');

  const reminderValueLabel = REMINDER_OFFSET_OPTIONS.find((opt) => opt.value === reminderOffset);
  const repeatValueLabel = isRepeatOn(repeatWeekdays)
    ? formatRepeatDaysLabel(repeatWeekdays, weekdaysShort)
    : t('sheetRepeatNone');

  const openRepeatPop = () => {
    setRemindOpen(false);
    setRepeatDraft(repeatWeekdays);
    popOpenedAt.current = Date.now();
    setRepeatOpen(true);
  };

  const commitRepeatPop = () => {
    setRepeatWeekdays(normalizeRepeatWeekdays(repeatDraft));
    setRepeatOpen(false);
  };

  const openRemindPop = () => {
    setRepeatOpen(false);
    setRemindDraft(reminderOffset);
    popOpenedAt.current = Date.now();
    setRemindOpen(true);
  };

  const commitRemindPop = () => {
    setReminderOffset(remindDraft);
    setRemindOpen(false);
    if (remindDraft === null) return;
    if (shouldShowFirstReminderHint(settings, remindDraft)) {
      markFirstReminderHintSeen();
      setReminderHintOpen(true);
    }
  };

  const closePops = () => {
    if (Date.now() - popOpenedAt.current < 400) return;
    setRepeatOpen(false);
    setRemindOpen(false);
  };

  const sheetBody = (
      <form
        className={`task-sheet${isDesktopLayout ? ' task-sheet--dock' : ''}`}
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSubmitSheet}
      >
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
                  min={slotDate && slotDate < todayStr ? slotDate : todayStr}
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
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
            e.preventDefault();
            void saveToSlot();
          }}
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

        <button
          type="button"
          className="task-sheet__choice"
          onClick={openRemindPop}
        >
          <span className="task-sheet__choice-icon"><BellRowIcon /></span>
          <span className="task-sheet__choice-label">{t('sheetRemind')}</span>
          <span className="task-sheet__choice-value">{reminderValueLabel ? t(reminderValueLabel.labelKey) : t('reminderNone')}</span>
        </button>

        <button
          type="button"
          className="task-sheet__choice"
          onClick={openRepeatPop}
        >
          <span className="task-sheet__choice-icon"><RepeatRowIcon /></span>
          <span className="task-sheet__choice-label">{t('sheetRepeat')}</span>
          <span className="task-sheet__choice-value">{repeatValueLabel}</span>
        </button>

        <label className="task-sheet__check">
          <input type="checkbox" checked={important} onChange={(e) => setImportant(e.target.checked)} />
          {t('sheetImportant')}
        </label>

        {editingTask && taskHasLumiLink(editingTask) && (
          <button
            type="button"
            className="task-sheet__lumi"
            onClick={() => {
              const desireId = editingTask.lumiDesireId;
              close();
              if (!desireId) return;
              requestOpenDesire(desireId);
              setScreen('lumi');
            }}
          >
            <span className="task-sheet__lumi-mark">
              {t('sheetFromLumi', { title: editingTask.lumiDesireTitle?.trim() || 'Lumi' })}
            </span>
            <span className="task-sheet__link">{t('sheetOpenLumi')}</span>
          </button>
        )}

        <div className="task-sheet__actions">
          <button
            type="submit"
            className="btn btn--primary"
            disabled={!title.trim() || !slotPicked || blockedPast}
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
      </form>
  );

  return (
    <>
      {isDesktopLayout ? (
        <aside className="task-sheet-dock" aria-label={t('sheetTitlePh')} data-desktop-dock>
          {sheetBody}
        </aside>
      ) : (
        createPortal(
          <div className="sheet-overlay" onClick={close}>
            {sheetBody}
          </div>,
          document.body,
        )
      )}
      {repeatOpen &&
        createPortal(
          <div
            className="repeat-pop-overlay"
            role="presentation"
            onClick={closePops}
          >
            <div
              className="repeat-pop"
              role="dialog"
              aria-modal="true"
              aria-labelledby="repeat-pop-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="repeat-pop__head">
                <h2 id="repeat-pop-title" className="repeat-pop__title">{t('sheetRepeat')}</h2>
                <button
                  type="button"
                  className={`repeat-pop__weekdays${isWeekdaysMonFri(repeatDraft) ? ' is-on' : ''}`}
                  onClick={() => setRepeatDraft([...REPEAT_WEEKDAYS_MON_FRI])}
                >
                  {t('sheetRepeatWeekdays')}
                </button>
              </div>
              <div className="repeat-pop__days" role="group" aria-label={t('sheetRepeatPickDays')}>
                {REPEAT_WEEKDAY_ORDER.map((day, i) => {
                  const on = repeatDraft.includes(day);
                  const raw = weekdaysShort[i] ?? '';
                  const label = raw ? raw.charAt(0) + raw.slice(1).toLowerCase() : '';
                  return (
                    <button
                      key={day}
                      type="button"
                      className={`repeat-pop__day${on ? ' is-on' : ''}`}
                      aria-pressed={on}
                      onClick={() => setRepeatDraft(toggleRepeatWeekday(repeatDraft, day))}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <div className="repeat-pop__actions">
                <button type="button" className="btn btn--ghost" onClick={() => setRepeatOpen(false)}>
                  {t('cancel')}
                </button>
                <button type="button" className="btn btn--primary" onClick={commitRepeatPop}>
                  {t('sheetRepeatDone')}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
      {remindOpen &&
        createPortal(
          <div
            className="repeat-pop-overlay"
            role="presentation"
            onClick={closePops}
          >
            <div
              className="repeat-pop"
              role="dialog"
              aria-modal="true"
              aria-labelledby="remind-pop-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="repeat-pop__head">
                <h2 id="remind-pop-title" className="repeat-pop__title">{t('sheetRemind')}</h2>
              </div>
              <div className="repeat-pop__opts" role="group" aria-label={t('sheetRemind')}>
                {REMINDER_OFFSET_OPTIONS.map((opt) => {
                  const on = opt.value === remindDraft;
                  return (
                    <button
                      key={String(opt.value)}
                      type="button"
                      aria-pressed={on}
                      className={`repeat-pop__opt${on ? ' is-on' : ''}`}
                      onClick={() => setRemindDraft(opt.value)}
                    >
                      {t(opt.labelKey)}
                    </button>
                  );
                })}
              </div>
              <div className="repeat-pop__actions">
                <button type="button" className="btn btn--ghost" onClick={() => setRemindOpen(false)}>
                  {t('cancel')}
                </button>
                <button type="button" className="btn btn--primary" onClick={commitRemindPop}>
                  {t('sheetRepeatDone')}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
      {reminderHintOpen &&
        createPortal(
          <ConfirmDialog
            title={t('firstReminderHintTitle')}
            message={t('firstReminderHintBody')}
            confirmLabel={t('firstReminderHintOpenSettings')}
            cancelLabel={t('firstReminderHintOk')}
            confirmTone="primary"
            onCancel={() => setReminderHintOpen(false)}
            onConfirm={() => {
              setReminderHintOpen(false);
              setScreen('settings-notifications');
            }}
          />,
          document.body,
        )}
    </>
  );
}
