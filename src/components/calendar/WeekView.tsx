import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { useApp } from '../../context/AppContext';
import { WEEKDAY_NAMES, WEEKDAY_SHORT } from '../../constants/categories';
import { getWeekZoomMetrics, WEEK_ZOOM_ADD_MIN, WEEK_ZOOM_BADGE_MIN, WEEK_ZOOM_DELETE_MIN, WEEK_ZOOM_DESC_MIN, WEEK_ZOOM_TIME_GROW_MAX, WEEK_ZOOM_TIME_GROW_MIN, WEEK_ZOOM_TITLE_MIN, WEEK_ZOOM_TITLE_ONLY_MAX, WEEK_ZOOM_WEEKDAY_FULL_MIN, weekZoomAtLeast, weekZoomPercent } from '../../constants/weekZoom';
import { HourSlot } from '../tasks/HourSlot';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import {
  addDays,
  getHoursRange,
  getWeekDays,
  hourRangeLabels,
  toLocalDateString,
} from '../../utils/date';
import {
  clipKindLabel,
  copyDayClipboard,
  copyHourClipboard,
  copyWeekClipboard,
  countTasksInDay,
  countTasksInHour,
  countTasksInWeek,
} from '../../utils/gridClipboard';
import type { Task } from '../../types';

function countWord(n: number) {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return 'дело';
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 > 20)) return 'дела';
  return 'дел';
}
import './CalendarViews.css';

type ClipPick = 'copy-day' | 'copy-hour' | 'paste-day' | 'paste-hour';

type PendingPaste =
  | { kind: 'week' }
  | { kind: 'day'; day: Date }
  | { kind: 'hour'; day: Date; hour: number };

export function WeekView({ viewportWidth }: { viewportWidth: number }) {
  const {
    focusDate, tasks, settings, weekZoom, setEditingTask, setSheetOpen,
    requestDelete, gridClipboard, setGridClipboard, pasteGridClipboard,
  } = useApp();

  const headerScrollRef = useRef<HTMLDivElement>(null);
  const gridScrollRef = useRef<HTMLDivElement>(null);
  const timeScrollRef = useRef<HTMLDivElement>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [pick, setPick] = useState<ClipPick | null>(null);
  const [toast, setToast] = useState('');
  const [pendingPaste, setPendingPaste] = useState<PendingPaste | null>(null);
  const toastTimer = useRef<number | null>(null);

  const { colWidth, rowHeight } = getWeekZoomMetrics(weekZoom, viewportWidth);
  /** До 60% × мешает на мелких карточках; с 60% и на дне — виден */
  const showSlotDelete = weekZoomAtLeast(weekZoom, WEEK_ZOOM_DELETE_MIN);
  const showSlotBadge = weekZoomAtLeast(weekZoom, WEEK_ZOOM_BADGE_MIN);
  const showSlotTitle = weekZoomAtLeast(weekZoom, WEEK_ZOOM_TITLE_MIN);
  const showSlotAdd = weekZoomAtLeast(weekZoom, WEEK_ZOOM_ADD_MIN);
  const zoomPct = weekZoomPercent(weekZoom);
  const titlesOnly = showSlotTitle && zoomPct <= Math.round(WEEK_ZOOM_TITLE_ONLY_MAX * 100);
  const showSlotDesc = weekZoomAtLeast(weekZoom, WEEK_ZOOM_DESC_MIN);

  const days = useMemo(
    () => getWeekDays(focusDate, settings.weekStartsOn),
    [focusDate, settings.weekStartsOn],
  );
  const hours = useMemo(
    () => getHoursRange(settings.dayStartHour, settings.dayEndHour),
    [settings.dayStartHour, settings.dayEndHour],
  );

  const tasksBySlot = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!settings.showCompleted && t.status === 'completed') continue;
      const d = new Date(t.startAt);
      const key = `${toLocalDateString(d)}-${d.getHours()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    for (const list of map.values()) list.sort((a, b) => a.order - b.order);
    return map;
  }, [tasks, settings.showCompleted]);

  const openDraft = (draft: Task) => {
    if (pick) return;
    setEditingTask(draft);
    setSheetOpen(true);
  };

  const showToast = (text: string) => {
    setToast(text);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 1800);
  };

  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

  const finishCopy = (clip: ReturnType<typeof copyWeekClipboard>, emptyHint: string, filledHint: string) => {
    setGridClipboard(clip);
    setMenuOpen(false);
    setPick(null);
    showToast(clip.items.length === 0 ? emptyHint : filledHint.replace('{n}', String(clip.items.length)));
  };

  const copyWeek = () => {
    const clip = copyWeekClipboard(tasks, focusDate, settings.weekStartsOn);
    finishCopy(clip, 'Неделя скопирована (пусто)', 'Неделя скопирована · {n}');
  };

  const requestPaste = (target: PendingPaste, count: number) => {
    setMenuOpen(false);
    setPick(null);
    if (count === 0) {
      void pasteGridClipboard(target.kind === 'week' ? { kind: 'week', focusDate } : target);
      showToast('Вставлено');
      return;
    }
    setPendingPaste(target);
  };

  const confirmPendingPaste = async () => {
    if (!pendingPaste) return;
    const target = pendingPaste;
    setPendingPaste(null);
    await pasteGridClipboard(target.kind === 'week' ? { kind: 'week', focusDate } : target);
    showToast('Вставлено');
  };

  const overwriteCount = pendingPaste
    ? pendingPaste.kind === 'week'
      ? countTasksInWeek(tasks, focusDate, settings.weekStartsOn)
      : pendingPaste.kind === 'day'
        ? countTasksInDay(tasks, pendingPaste.day)
        : countTasksInHour(tasks, pendingPaste.day, pendingPaste.hour)
    : 0;

  const overwriteScope = pendingPaste?.kind === 'week'
    ? 'неделе'
    : pendingPaste?.kind === 'day'
      ? 'дне'
      : 'часе';

  const onPickDay = (day: Date) => {
    if (pick === 'copy-day') {
      const clip = copyDayClipboard(tasks, day);
      finishCopy(clip, 'День скопирован (пусто)', 'День скопирован · {n}');
      return;
    }
    if (pick === 'paste-day' && gridClipboard?.kind === 'day') {
      requestPaste({ kind: 'day', day }, countTasksInDay(tasks, day));
    }
  };

  const onPickHour = (day: Date, hour: number) => {
    if (pick === 'copy-hour') {
      const clip = copyHourClipboard(tasks, day, hour);
      finishCopy(clip, 'Час скопирован (пусто)', 'Час скопирован · {n}');
      return;
    }
    if (pick === 'paste-hour' && gridClipboard?.kind === 'hour') {
      requestPaste({ kind: 'hour', day, hour }, countTasksInHour(tasks, day, hour));
    }
  };

  const startPick = (next: ClipPick) => {
    setMenuOpen(false);
    setPick(next);
  };

  const toggleMenu = () => {
    if (pick) {
      setPick(null);
      return;
    }
    setMenuOpen((v) => !v);
  };

  const syncScroll = useCallback((source: 'grid' | 'time') => {
    const grid = gridScrollRef.current;
    const time = timeScrollRef.current;
    const header = headerScrollRef.current;
    if (!grid || !time || !header) return;
    if (source === 'grid') {
      time.scrollTop = grid.scrollTop;
      header.scrollLeft = grid.scrollLeft;
    } else {
      grid.scrollTop = time.scrollTop;
    }
  }, []);

  const showFullWeekday = weekZoomAtLeast(weekZoom, WEEK_ZOOM_WEEKDAY_FULL_MIN);
  const gridWidth = colWidth * days.length;
  const timeT = Math.max(0, Math.min(weekZoom, WEEK_ZOOM_TIME_GROW_MAX) - WEEK_ZOOM_TIME_GROW_MIN);
  const timeScaleY = 1.22 + timeT * 1.1;
  const timeFontPx = 12 + timeT * 10;
  const pickDay = pick === 'copy-day' || pick === 'paste-day';
  const pickHour = pick === 'copy-hour' || pick === 'paste-hour';

  const style = {
    '--week-col-width': `${colWidth}px`,
    '--week-row-height': `${rowHeight}px`,
    '--week-time-y': String(timeScaleY),
    '--week-time-size': `${timeFontPx}px`,
  } as CSSProperties;

  return (
    <div
      className={[
        'week-view',
        titlesOnly && 'week-view--sm-title',
        pickDay && 'week-view--pick-day',
        pickHour && 'week-view--pick-hour',
      ].filter(Boolean).join(' ')}
      style={style}
    >
      <div className="week-view__header-row">
        <div className="week-view__time-spacer">
          <button
            type="button"
            className={`week-view__clip ${gridClipboard ? 'week-view__clip--armed' : ''}`}
            aria-label={gridClipboard ? 'Копировать или вставить сетку' : 'Копировать сетку'}
            aria-expanded={menuOpen}
            onClick={toggleMenu}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
              <rect x="8" y="8" width="12" height="12" rx="2" />
              <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" strokeLinecap="round" />
            </svg>
          </button>
          {menuOpen && (
            <>
              <button type="button" className="week-view__clip-backdrop" aria-label="Закрыть" onClick={() => setMenuOpen(false)} />
              <div className="week-view__clip-menu" role="menu">
                <p className="week-view__clip-status">
                  {gridClipboard
                    ? `Скопировано: ${clipKindLabel(gridClipboard.kind)} · ${gridClipboard.items.length} ${countWord(gridClipboard.items.length)}`
                    : 'Скопируйте шаблон, потом вставьте на другую неделю'}
                </p>
                {gridClipboard && (
                  <>
                    <button
                      type="button"
                      role="menuitem"
                      className="week-view__clip-item week-view__clip-item--paste"
                      onClick={() => {
                        if (gridClipboard.kind === 'week') {
                          requestPaste(
                            { kind: 'week' },
                            countTasksInWeek(tasks, focusDate, settings.weekStartsOn),
                          );
                          return;
                        }
                        startPick(gridClipboard.kind === 'day' ? 'paste-day' : 'paste-hour');
                      }}
                    >
                      <span className="week-view__clip-item-title">
                        {gridClipboard.kind === 'week' && 'Вставить неделю сюда'}
                        {gridClipboard.kind === 'day' && 'Вставить день…'}
                        {gridClipboard.kind === 'hour' && 'Вставить час…'}
                      </span>
                      <span className="week-view__clip-item-hint">
                        {gridClipboard.kind === 'week' && 'Заменит все дни на этом экране'}
                        {gridClipboard.kind === 'day' && 'Нажмите день в шапке, куда положить'}
                        {gridClipboard.kind === 'hour' && 'Нажмите слот, куда положить'}
                      </span>
                    </button>
                    <p className="week-view__clip-heading week-view__clip-heading--sub">Или скопировать другое</p>
                  </>
                )}
                {!gridClipboard && (
                  <p className="week-view__clip-heading">Скопировать</p>
                )}
                <button type="button" role="menuitem" className="week-view__clip-item" onClick={copyWeek}>
                  <span className="week-view__clip-item-title">Эту неделю</span>
                  <span className="week-view__clip-item-hint">Все незавершённые дела с экрана</span>
                </button>
                <button type="button" role="menuitem" className="week-view__clip-item" onClick={() => startPick('copy-day')}>
                  <span className="week-view__clip-item-title">Один день…</span>
                  <span className="week-view__clip-item-hint">Потом нажмите Пн–Вс в шапке</span>
                </button>
                <button type="button" role="menuitem" className="week-view__clip-item" onClick={() => startPick('copy-hour')}>
                  <span className="week-view__clip-item-title">Один час…</span>
                  <span className="week-view__clip-item-hint">Потом нажмите нужный слот</span>
                </button>
              </div>
            </>
          )}
        </div>
        <div
          className="week-view__header-scroll"
          ref={headerScrollRef}
        >
          <div className="week-view__header-inner" style={{ width: gridWidth }}>
            {days.map((d) => {
              const wi = (d.getDay() + 6) % 7;
              const raw = WEEKDAY_NAMES[wi] ?? '';
              const name = showFullWeekday
                ? raw.charAt(0) + raw.slice(1).toLowerCase()
                : WEEKDAY_SHORT[wi];
              const label = (
                <>
                  <span className="week-view__day-name">{name}</span>
                  <span className="week-view__day-num">{d.getDate()}</span>
                </>
              );
              if (pickDay) {
                return (
                  <button
                    key={d.toISOString()}
                    type="button"
                    className="week-view__day-head week-view__day-head--pick"
                    onClick={() => onPickDay(d)}
                  >
                    {label}
                  </button>
                );
              }
              return (
                <div key={d.toISOString()} className="week-view__day-head">
                  {label}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {pick && (
        <div className="week-view__pick-bar">
          <span>
            {pick === 'copy-day' && 'Нажмите на день в шапке'}
            {pick === 'copy-hour' && 'Нажмите на час в сетке'}
            {pick === 'paste-day' && 'Куда вставить день? Нажмите на день'}
            {pick === 'paste-hour' && 'Куда вставить час? Нажмите на слот'}
          </span>
          <button type="button" onClick={() => setPick(null)}>Отмена</button>
        </div>
      )}
      {toast && !pick && <p className="week-view__clip-toast">{toast}</p>}

      <div className="week-view__body">
        <div
          className="week-view__time-col"
          ref={timeScrollRef}
          onScroll={() => syncScroll('time')}
        >
          {hours.map((h) => {
            const { start, end } = hourRangeLabels(h);
            return (
              <div key={h} className="week-view__time-label">
                <span className="week-view__time-start">{start}</span>
                <span className="week-view__time-dash" aria-hidden>–</span>
                <span className="week-view__time-end">{end}</span>
              </div>
            );
          })}
        </div>

        <div
          className={`week-view__grid-scroll ${weekZoom > 0.45 ? 'week-view__grid-scroll--snap' : ''}`}
          ref={gridScrollRef}
          onScroll={() => syncScroll('grid')}
        >
          <div className="week-view__grid" style={{ width: gridWidth }}>
            {days.map((day) => (
              <div key={day.toISOString()} className="week-view__col">
                {hours.map((h) => {
                  const key = `${toLocalDateString(day)}-${h}`;
                  const slotTasks = tasksBySlot.get(key) ?? [];
                  return (
                    <div key={h} className="week-view__slot">
                      <HourSlot
                        day={day}
                        hour={h}
                        tasks={slotTasks}
                        compact
                        onTaskClick={(task) => {
                          if (pick) return;
                          setEditingTask(task);
                          setSheetOpen(true);
                        }}
                        onTaskDelete={(task) => requestDelete(task)}
                        showDelete={showSlotDelete && !pick}
                        showBadge={showSlotBadge}
                        showTitle={showSlotTitle}
                        showDesc={showSlotDesc}
                        showAddStrip={showSlotAdd && !pick}
                        onAdd={openDraft}
                      />
                      {pickHour && (
                        <button
                          type="button"
                          className="week-view__pick-hit"
                          aria-label={`${toLocalDateString(day)} ${h}:00`}
                          onClick={() => onPickHour(day, h)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {pendingPaste && (
        <ConfirmDialog
          title="Заменить записи?"
          message={`В этом ${overwriteScope} уже ${overwriteCount} ${overwriteCount === 1 ? 'дело' : overwriteCount < 5 ? 'дела' : 'дел'}. Их заменит скопированн${pendingPaste.kind === 'week' ? 'ая неделя' : pendingPaste.kind === 'day' ? 'ый день' : 'ый час'}.`}
          confirmLabel="Заменить"
          cancelLabel="Отмена"
          confirmTone="primary"
          onCancel={() => setPendingPaste(null)}
          onConfirm={() => { void confirmPendingPaste(); }}
        />
      )}
    </div>
  );
}

export function DayView() {
  const {
    focusDate, setFocusDate, tasks, settings, setEditingTask, setSheetOpen, requestDelete,
  } = useApp();
  const hours = useMemo(
    () => getHoursRange(settings.dayStartHour, settings.dayEndHour),
    [settings.dayStartHour, settings.dayEndHour],
  );
  const dateStr = toLocalDateString(focusDate);
  const drag = useRef<{ id: number; x: number; y: number; locked?: 'x' | 'y' } | null>(null);
  const offsetRef = useRef(0);
  const [offsetX, setOffsetX] = useState(0);

  const tasksByHour = useMemo(() => {
    const map = new Map<number, Task[]>();
    for (const t of tasks) {
      if (!settings.showCompleted && t.status === 'completed') continue;
      const d = new Date(t.startAt);
      if (toLocalDateString(d) !== dateStr) continue;
      const h = d.getHours();
      if (!map.has(h)) map.set(h, []);
      map.get(h)!.push(t);
    }
    for (const list of map.values()) list.sort((a, b) => a.order - b.order);
    return map;
  }, [tasks, dateStr, settings.showCompleted]);

  const onPointerDown = (e: ReactPointerEvent) => {
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const start = drag.current;
    if (!start || start.id !== e.pointerId) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (!start.locked) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      start.locked = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (start.locked === 'x') {
      e.preventDefault();
      offsetRef.current = dx;
      setOffsetX(dx);
    }
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    const start = drag.current;
    if (!start || start.id !== e.pointerId) return;
    const dx = offsetRef.current;
    drag.current = null;
    offsetRef.current = 0;
    setOffsetX(0);
    if (start.locked === 'x' && Math.abs(dx) > 56) {
      setFocusDate(addDays(focusDate, dx < 0 ? 1 : -1));
    }
  };

  return (
    <div
      className={`day-view ${offsetX !== 0 ? 'day-view--dragging' : ''}`}
      style={{ transform: `translateX(${offsetX * 0.35}px)` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {hours.map((h) => {
        const slotTasks = tasksByHour.get(h) ?? [];
        if (settings.hideEmptyHours && slotTasks.length === 0) return null;
        const { start, end } = hourRangeLabels(h);
        return (
          <div key={h} className="day-view__row">
            <div className="day-view__time">
              <span className="week-view__time-start">{start}</span>
              <span className="week-view__time-dash" aria-hidden>–</span>
              <span className="week-view__time-end">{end}</span>
            </div>
            <div className="day-view__slot">
              <HourSlot
                day={focusDate}
                hour={h}
                tasks={slotTasks}
                onTaskClick={(task) => {
                  setEditingTask(task);
                  setSheetOpen(true);
                }}
                onTaskDelete={(task) => requestDelete(task)}
                onAdd={(draft) => {
                  setEditingTask(draft);
                  setSheetOpen(true);
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
