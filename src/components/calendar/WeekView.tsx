import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MutableRefObject, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/useI18n';
import { WEEK_TIME_COL_WIDTH } from '../../constants/weekLayout';
import { getWeekZoomMetrics, WEEK_ZOOM_ADD_MIN, WEEK_ZOOM_BADGE_MIN, WEEK_ZOOM_DELETE_MIN, WEEK_ZOOM_DESC_MIN, WEEK_ZOOM_TITLE_MIN, WEEK_ZOOM_TITLE_ONLY_MAX, WEEK_ZOOM_WEEKDAY_FULL_MIN, weekZoomAtLeast, weekZoomPercent } from '../../constants/weekZoom';
import { applyLiveWeekPinch, type WeekPinchLive } from '../../utils/weekPinchLive';
import { HourSlot } from '../tasks/HourSlot';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import {
  addDays,
  formatWeekHeaderTitle,
  getHoursRange,
  getWeekDays,
  hourRangeLabels,
  isLockedCreateDay,
  isPastDay,
  isSameDay,
  isToday,
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
import { useNow } from '../../hooks/useNow';
import { nowInHourGrid } from '../../utils/nowIndicator';
import { NowIndicator } from './NowIndicator';
import './CalendarViews.css';

type ClipPick = 'copy-day' | 'copy-hour' | 'paste-day' | 'paste-hour';

type PendingPaste =
  | { kind: 'week' }
  | { kind: 'day'; day: Date }
  | { kind: 'hour'; day: Date; hour: number };

export function WeekView({
  viewportWidth,
  pinching = false,
  weekPinchLive,
}: {
  viewportWidth: number;
  pinching?: boolean;
  weekPinchLive?: MutableRefObject<WeekPinchLive>;
}) {
  const {
    focusDate, tasks, settings, weekZoom, zoom, setEditingTask, setSheetOpen,
    requestDelete, gridClipboard, setGridClipboard, pasteGridClipboard, upsertTask,
  } = useApp();
  const { t, taskWord, weekdays, weekdaysShort, locale, monthsGen, dateTag } = useI18n();

  const gridScrollRef = useRef<HTMLDivElement>(null);
  const daysTrackRef = useRef<HTMLDivElement>(null);
  const weekRootRef = useRef<HTMLDivElement>(null);
  const gridInnerRef = useRef<HTMLDivElement>(null);
  const pinchOriginRef = useRef<{ col: number; row: number } | null>(null);
  const horizontalScrollRef = useRef(0);
  const layoutRef = useRef({ viewportWidth, dayCount: 7, hourCount: 15 });
  const now = useNow();

  const [menuOpen, setMenuOpen] = useState(false);
  const [pick, setPick] = useState<ClipPick | null>(null);
  const [toast, setToast] = useState('');
  const [pendingPaste, setPendingPaste] = useState<PendingPaste | null>(null);
  const toastTimer = useRef<number | null>(null);
  const undoSwipeIdsRef = useRef(new Set<string>());
  const [undoSwipeTick, setUndoSwipeTick] = useState(0);

  const markUndoSwipeVisible = (taskId: string) => {
    undoSwipeIdsRef.current.add(taskId);
    setUndoSwipeTick((n) => n + 1);
    window.setTimeout(() => {
      if (!undoSwipeIdsRef.current.delete(taskId)) return;
      setUndoSwipeTick((n) => n + 1);
    }, 15000);
  };

  const taskVisibleInGrid = (t: Task) =>
    t.status !== 'completed'
    || settings.showCompleted
    || undoSwipeIdsRef.current.has(t.id);

  const { colWidth, rowHeight } = getWeekZoomMetrics(weekZoom, viewportWidth);
  const metricsHold = useRef({ colWidth, rowHeight });
  if (!pinching) metricsHold.current = { colWidth, rowHeight };
  /** До 60% × мешает на мелких карточках; с 60% и на дне — виден */
  const showSlotDelete = weekZoomAtLeast(weekZoom, WEEK_ZOOM_DELETE_MIN);
  const showSlotBadge = weekZoomAtLeast(weekZoom, WEEK_ZOOM_BADGE_MIN);
  const showSlotTitle = weekZoomAtLeast(weekZoom, WEEK_ZOOM_TITLE_MIN);
  const showSlotAdd = weekZoomAtLeast(weekZoom, WEEK_ZOOM_ADD_MIN);
  const swipeComplete = !pick;
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
      if (!taskVisibleInGrid(t)) continue;
      const d = new Date(t.startAt);
      const key = `${toLocalDateString(d)}-${d.getHours()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    for (const list of map.values()) list.sort((a, b) => a.order - b.order);
    return map;
  }, [tasks, settings.showCompleted, undoSwipeTick]);

  const openDraft = (draft: Task) => {
    if (pick) return;
    if (isLockedCreateDay(new Date(draft.startAt))) return;
    setEditingTask(draft);
    setSheetOpen(true);
  };

  const completeTask = (task: Task) => {
    if (pick || task.status === 'completed') return;
    markUndoSwipeVisible(task.id);
    void upsertTask({ ...task, status: 'completed' });
  };

  const restoreTask = (task: Task) => {
    if (pick || task.status !== 'completed') return;
    undoSwipeIdsRef.current.delete(task.id);
    void upsertTask({ ...task, status: 'active' });
  };

  const showToast = (text: string) => {
    setToast(text);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 1800);
  };

  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

  useEffect(() => {
    if (zoom !== 'day' || pinching) return;
    const grid = gridScrollRef.current;
    const daysTrack = daysTrackRef.current;
    if (!grid) return;
    const idx = Math.max(0, days.findIndex((d) => isSameDay(d, focusDate)));
    const firstHour = settings.dayStartHour;
    const pos = nowInHourGrid(new Date(), firstHour, settings.dayEndHour);
    const viewH = grid.clientHeight;
    const nowY = pos ? pos.ratio * hours.length * rowHeight : 0;
    const top = pos && isToday(focusDate)
      ? Math.max(0, nowY - viewH / 3)
      : 0;
    const left = idx * colWidth;
    const apply = () => {
      grid.scrollLeft = left;
      grid.scrollTop = top;
      if (daysTrack) daysTrack.style.transform = `translate3d(${-left}px,0,0)`;
    };
    apply();
    const frame = requestAnimationFrame(apply);
    return () => cancelAnimationFrame(frame);
  }, [
    zoom,
    focusDate,
    days,
    hours.length,
    colWidth,
    rowHeight,
    settings.dayStartHour,
    settings.dayEndHour,
    pinching,
  ]);

  layoutRef.current = { viewportWidth, dayCount: days.length, hourCount: hours.length };
  if (weekPinchLive) {
    weekPinchLive.current.apply = (level, focus) => {
      const root = weekRootRef.current;
      const grid = gridScrollRef.current;
      if (!root || !grid) return;
      const { viewportWidth: vw, dayCount, hourCount } = layoutRef.current;
      pinchOriginRef.current = applyLiveWeekPinch({
        root,
        grid,
        daysTrack: daysTrackRef.current,
        gridInner: gridInnerRef.current,
        viewportWidth: vw,
        dayCount,
        hourCount,
        level,
        focus,
        origin: pinchOriginRef.current,
      });
      const m = getWeekZoomMetrics(level, vw);
      metricsHold.current = { colWidth: m.colWidth, rowHeight: m.rowHeight };
    };
    weekPinchLive.current.reset = () => {
      pinchOriginRef.current = null;
    };
  }

  useEffect(() => {
    if (zoom !== 'week' || pinching) return;
    const grid = gridScrollRef.current;
    if (!grid) return;
    const todayInWeek = days.some((d) => isToday(d));
    const pos = nowInHourGrid(new Date(), settings.dayStartHour, settings.dayEndHour);
    if (!todayInWeek || !pos) return;
    let done = false;
    const apply = () => {
      if (done || grid.clientHeight < 48) return;
      const nowY = pos.ratio * hours.length * rowHeight;
      const top = Math.max(0, nowY - grid.clientHeight / 3);
      grid.scrollTop = top;
      done = true;
    };
    apply();
    const frame = requestAnimationFrame(apply);
    const late = window.setTimeout(apply, 120);
    const ro = new ResizeObserver(apply);
    ro.observe(grid);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(late);
      ro.disconnect();
    };
    // rowHeight из замыкания: щипок не должен снова прыгать к «сейчас».
    // pinching не в deps — иначе после жеста снова прыгнем к «сейчас».
  }, [zoom, focusDate, days, hours.length, settings.dayStartHour, settings.dayEndHour]);

  const finishCopy = (clip: ReturnType<typeof copyWeekClipboard>, emptyHint: string, filledHint: string) => {
    setGridClipboard(clip);
    setMenuOpen(false);
    setPick(null);
    showToast(clip.items.length === 0 ? emptyHint : filledHint.replace('{n}', String(clip.items.length)));
  };

  const copyWeek = () => {
    const clip = copyWeekClipboard(tasks, focusDate, settings.weekStartsOn);
    finishCopy(clip, t('weekCopiedEmpty'), t('weekCopiedN'));
  };

  const requestPaste = (target: PendingPaste, count: number) => {
    setMenuOpen(false);
    setPick(null);
    if (target.kind === 'day' && isLockedCreateDay(target.day)) {
      showToast(t('sheetNoPastDay'));
      return;
    }
    if (target.kind === 'hour' && isLockedCreateDay(target.day)) {
      showToast(t('sheetNoPastDay'));
      return;
    }
    if (target.kind === 'week') {
      const live = getWeekDays(focusDate, settings.weekStartsOn).some((d) => !isLockedCreateDay(d));
      if (!live) {
        showToast(t('sheetNoPastDay'));
        return;
      }
    }
    if (count === 0) {
      void pasteGridClipboard(target.kind === 'week' ? { kind: 'week', focusDate } : target);
      showToast(t('pasted'));
      return;
    }
    setPendingPaste(target);
  };

  const confirmPendingPaste = async () => {
    if (!pendingPaste) return;
    const target = pendingPaste;
    setPendingPaste(null);
    await pasteGridClipboard(target.kind === 'week' ? { kind: 'week', focusDate } : target);
    showToast(t('pasted'));
  };

  const overwriteCount = pendingPaste
    ? pendingPaste.kind === 'week'
      ? countTasksInWeek(tasks, focusDate, settings.weekStartsOn)
      : pendingPaste.kind === 'day'
        ? countTasksInDay(tasks, pendingPaste.day)
        : countTasksInHour(tasks, pendingPaste.day, pendingPaste.hour)
    : 0;

  const overwriteScope = pendingPaste?.kind === 'week'
    ? t('inWeek')
    : pendingPaste?.kind === 'day'
      ? t('inDay')
      : t('inHour');

  const onPickDay = (day: Date) => {
    if (pick === 'copy-day') {
      const clip = copyDayClipboard(tasks, day);
      finishCopy(clip, t('dayCopiedEmpty'), t('dayCopiedN'));
      return;
    }
    if (pick === 'paste-day' && gridClipboard?.kind === 'day') {
      requestPaste({ kind: 'day', day }, countTasksInDay(tasks, day));
    }
  };

  const onPickHour = (day: Date, hour: number) => {
    if (pick === 'copy-hour') {
      const clip = copyHourClipboard(tasks, day, hour);
      finishCopy(clip, t('hourCopiedEmpty'), t('hourCopiedN'));
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

  const syncScroll = useCallback(() => {
    const grid = gridScrollRef.current;
    const daysTrack = daysTrackRef.current;
    if (!grid) return;
    if (daysTrack && horizontalScrollRef.current !== grid.scrollLeft) {
      horizontalScrollRef.current = grid.scrollLeft;
      daysTrack.style.transform = `translate3d(${-grid.scrollLeft}px,0,0)`;
    }
  }, []);

  const showFullWeekday = weekZoomAtLeast(weekZoom, WEEK_ZOOM_WEEKDAY_FULL_MIN);
  const layoutCol = pinching ? metricsHold.current.colWidth : colWidth;
  const layoutRow = pinching ? metricsHold.current.rowHeight : rowHeight;
  const gridWidth = layoutCol * days.length;
  const gridInnerWidth = WEEK_TIME_COL_WIDTH + gridWidth;
  const pickDay = pick === 'copy-day' || pick === 'paste-day';
  const pickHour = pick === 'copy-hour' || pick === 'paste-hour';

  const clipStatusMeta = useMemo(() => {
    if (!gridClipboard) return '';
    if (gridClipboard.kind === 'week') {
      const range = formatWeekHeaderTitle(focusDate, settings.weekStartsOn, dateTag, monthsGen);
      return `${t('kindWeekCap')} · ${range}`;
    }
    const n = gridClipboard.items.length;
    const kind = clipKindLabel(gridClipboard.kind, locale);
    return `${kind} · ${n} ${taskWord(n)}`;
  }, [gridClipboard, focusDate, settings.weekStartsOn, dateTag, monthsGen, t, locale, taskWord]);

  const onPasteFromMenu = () => {
    if (!gridClipboard) return;
    if (gridClipboard.kind === 'week') {
      requestPaste(
        { kind: 'week' },
        countTasksInWeek(tasks, focusDate, settings.weekStartsOn),
      );
      return;
    }
    startPick(gridClipboard.kind === 'day' ? 'paste-day' : 'paste-hour');
  };

  const style = {
    '--week-col-width': `${layoutCol}px`,
    '--week-row-height': `${layoutRow}px`,
  } as CSSProperties;

  return (
    <div
      ref={weekRootRef}
      className={[
        'week-view',
        titlesOnly && 'week-view--sm-title',
        pickDay && 'week-view--pick-day',
        pickHour && 'week-view--pick-hour',
      ].filter(Boolean).join(' ')}
      style={style}
    >
      {pick && (
        <div className="week-view__pick-bar">
          <span>
            {pick === 'copy-day' && t('pickCopyDay')}
            {pick === 'copy-hour' && t('pickCopyHour')}
            {pick === 'paste-day' && t('pickPasteDay')}
            {pick === 'paste-hour' && t('pickPasteHour')}
          </span>
          <button type="button" onClick={() => setPick(null)}>{t('cancel')}</button>
        </div>
      )}
      {toast && !pick && <p className="week-view__clip-toast">{toast}</p>}

      <div className="week-view__head-float">
        <div className="week-view__time-head">
          <button
            type="button"
            className={`week-view__clip ${gridClipboard ? 'week-view__clip--armed' : ''}`}
            aria-label={gridClipboard ? t('copyOrPasteGrid') : t('copyGrid')}
            aria-expanded={menuOpen}
            onClick={toggleMenu}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
              <rect x="8" y="8" width="12" height="12" rx="2" />
              <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="week-view__days-clip">
          <div
            className="week-view__days-track"
            ref={daysTrackRef}
            style={{ width: gridWidth }}
          >
            {days.map((d) => {
              const wi = (d.getDay() + 6) % 7;
              const raw = weekdays[wi] ?? '';
              const fullName = raw.charAt(0) + raw.slice(1).toLowerCase();
              const shortName = weekdaysShort[wi];
              const when = isToday(d) ? 'today' : isPastDay(d) ? 'past' : null;
              const headClass = [
                'week-view__day-head',
                when && `week-view__day-head--${when}`,
                pickDay && 'week-view__day-head--pick',
              ].filter(Boolean).join(' ');
              const label = (
                <>
                  <span className="week-view__day-name">
                    {showFullWeekday ? fullName : shortName}
                  </span>
                  <span className="week-view__day-num">{d.getDate()}</span>
                </>
              );
              if (pickDay) {
                return (
                  <button
                    key={d.toISOString()}
                    type="button"
                    className={headClass}
                    onClick={() => onPickDay(d)}
                  >
                    {label}
                  </button>
                );
              }
              return (
                <div key={d.toISOString()} className={headClass}>
                  {label}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="week-view__body">
        <div
          className={`week-view__grid-scroll ${weekZoom > 0.45 && !pinching ? 'week-view__grid-scroll--snap' : ''}`}
          ref={gridScrollRef}
          onScroll={() => {
            syncScroll();
          }}
        >
          <div className="week-view__grid" ref={gridInnerRef} style={{ width: gridInnerWidth }}>
            <div className="week-view__time-col">
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
            {days.map((day) => {
              const when = isToday(day) ? 'today' : isPastDay(day) ? 'past' : null;
              return (
              <div
                key={day.toISOString()}
                className={['week-view__col', when && `week-view__col--${when}`].filter(Boolean).join(' ')}
              >
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
                        onTaskComplete={completeTask}
                        onTaskRestore={restoreTask}
                        swipeComplete={swipeComplete}
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
                {when === 'today' && (zoom !== 'day' || isToday(focusDate)) && (
                  <NowIndicator
                    now={now}
                    dayStartHour={settings.dayStartHour}
                    dayEndHour={settings.dayEndHour}
                    showLabel
                  />
                )}
              </div>
              );
            })}
          </div>
        </div>
      </div>

      {menuOpen && (
        <>
          <button type="button" className="week-view__clip-backdrop" aria-label={t('close')} onClick={() => setMenuOpen(false)} />
          <div className="week-view__clip-menu" role="menu">
            {gridClipboard && (
              <div className="week-view__clip-banner">
                <span className="week-view__clip-banner-check" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <div className="week-view__clip-banner-text">
                  <span className="week-view__clip-banner-title">{t('clipCopiedTitle')}</span>
                  <span className="week-view__clip-banner-meta">{clipStatusMeta}</span>
                </div>
                <button
                  type="button"
                  className="week-view__clip-clear"
                  onClick={() => setGridClipboard(null)}
                >
                  {t('clipClear')}
                </button>
              </div>
            )}

            <p className="week-view__clip-heading">{t('copyHeading')}</p>
            <ClipMenuRow
              icon={<ClipIconWeek />}
              title={t('copyThisWeek')}
              hint={t('copyThisWeekHint')}
              onClick={copyWeek}
            />
            <ClipMenuRow
              icon={<ClipIconDay />}
              title={t('copyOneDay')}
              hint={t('copyOneDayHint')}
              onClick={() => startPick('copy-day')}
            />
            <ClipMenuRow
              icon={<ClipIconHour />}
              title={t('copyOneHour')}
              hint={t('copyOneHourHint')}
              onClick={() => startPick('copy-hour')}
            />

            <p className="week-view__clip-heading week-view__clip-heading--paste">
              {gridClipboard ? t('pasteHeadingInto') : t('pasteHeading')}
            </p>
            {gridClipboard ? (
              <ClipMenuRow
                icon={<ClipIconPaste />}
                title={
                  gridClipboard.kind === 'week'
                    ? t('pasteWeekHere')
                    : gridClipboard.kind === 'day'
                      ? t('pastePickDay')
                      : t('pastePickHour')
                }
                hint={
                  gridClipboard.kind === 'week'
                    ? t('pasteWeekHint')
                    : gridClipboard.kind === 'day'
                      ? t('pastePickDayHint')
                      : t('pastePickHourHint')
                }
                tone="paste"
                onClick={onPasteFromMenu}
              />
            ) : (
              <ClipMenuRow
                icon={<ClipIconPasteMuted />}
                title={t('pastePrevCopied')}
                hint={t('pastePrevCopiedHint')}
                disabled
              />
            )}

            <p className="week-view__clip-footer">
              {gridClipboard ? t('clipFlowHintReady') : t('clipFlowHintEmpty')}
            </p>
          </div>
        </>
      )}

      {pendingPaste && (
        <ConfirmDialog
          title={t('replaceTitle')}
          message={t('replaceMsg', { scope: overwriteScope, n: overwriteCount, word: taskWord(overwriteCount) })}
          confirmLabel={t('replace')}
          cancelLabel={t('cancel')}
          confirmTone="primary"
          onCancel={() => setPendingPaste(null)}
          onConfirm={() => { void confirmPendingPaste(); }}
        />
      )}
    </div>
  );
}

function ClipMenuRow({
  icon,
  title,
  hint,
  onClick,
  disabled,
  tone = 'default',
}: {
  icon: ReactNode;
  title: string;
  hint: string;
  onClick?: () => void;
  disabled?: boolean;
  tone?: 'default' | 'paste';
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={[
        'week-view__clip-row',
        tone === 'paste' && 'week-view__clip-row--paste',
        disabled && 'week-view__clip-row--disabled',
      ].filter(Boolean).join(' ')}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="week-view__clip-row-icon">{icon}</span>
      <span className="week-view__clip-row-text">
        <span className="week-view__clip-row-title">{title}</span>
        <span className="week-view__clip-row-hint">{hint}</span>
      </span>
      <span className="week-view__clip-row-chev" aria-hidden>›</span>
    </button>
  );
}

function ClipIconWeek() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="week-view__clip-svg week-view__clip-svg--week">
      <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 9h16" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 5V3M15 5V3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8 13h2M14 13h2M8 17h2M14 17h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ClipIconDay() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="week-view__clip-svg week-view__clip-svg--day">
      <rect x="5" y="6" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 10h14" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="9" cy="14" r="1" fill="currentColor" />
      <circle cx="12" cy="14" r="1" fill="currentColor" />
      <circle cx="15" cy="14" r="1" fill="currentColor" />
    </svg>
  );
}

function ClipIconHour() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="week-view__clip-svg week-view__clip-svg--hour">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ClipIconPaste() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="week-view__clip-svg week-view__clip-svg--paste">
      <rect x="8" y="4" width="10" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6 8h10a2 2 0 0 1 2 2v10H8a2 2 0 0 1-2-2V8z" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function ClipIconPasteMuted() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="week-view__clip-svg week-view__clip-svg--paste-muted">
      <rect x="8" y="4" width="10" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6 8h10a2 2 0 0 1 2 2v10H8a2 2 0 0 1-2-2V8z" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function DayView() {
  const {
    focusDate, setFocusDate, tasks, settings, setEditingTask, setSheetOpen, requestDelete, upsertTask,
  } = useApp();
  const hours = useMemo(
    () => getHoursRange(settings.dayStartHour, settings.dayEndHour),
    [settings.dayStartHour, settings.dayEndHour],
  );
  const dateStr = toLocalDateString(focusDate);
  const drag = useRef<{ id: number; x: number; y: number; locked?: 'x' | 'y' } | null>(null);
  const offsetRef = useRef(0);
  const [offsetX, setOffsetX] = useState(0);
  const undoSwipeIdsRef = useRef(new Set<string>());
  const [undoSwipeTick, setUndoSwipeTick] = useState(0);

  const markUndoSwipeVisible = (taskId: string) => {
    undoSwipeIdsRef.current.add(taskId);
    setUndoSwipeTick((n) => n + 1);
    window.setTimeout(() => {
      if (!undoSwipeIdsRef.current.delete(taskId)) return;
      setUndoSwipeTick((n) => n + 1);
    }, 15000);
  };

  const tasksByHour = useMemo(() => {
    const map = new Map<number, Task[]>();
    for (const t of tasks) {
      const showCompleted = settings.showCompleted || undoSwipeIdsRef.current.has(t.id);
      if (!showCompleted && t.status === 'completed') continue;
      const d = new Date(t.startAt);
      if (toLocalDateString(d) !== dateStr) continue;
      const h = d.getHours();
      if (!map.has(h)) map.set(h, []);
      map.get(h)!.push(t);
    }
    for (const list of map.values()) list.sort((a, b) => a.order - b.order);
    return map;
  }, [tasks, dateStr, settings.showCompleted, undoSwipeTick]);

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
      className={[
        'day-view',
        offsetX !== 0 && 'day-view--dragging',
        isToday(focusDate) && 'day-view--today',
        isPastDay(focusDate) && 'day-view--past',
      ].filter(Boolean).join(' ')}
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
                onTaskComplete={(task) => {
                  if (task.status === 'completed') return;
                  markUndoSwipeVisible(task.id);
                  void upsertTask({ ...task, status: 'completed' });
                }}
                onTaskRestore={(task) => {
                  if (task.status !== 'completed') return;
                  undoSwipeIdsRef.current.delete(task.id);
                  void upsertTask({ ...task, status: 'active' });
                }}
                swipeComplete
                onAdd={(draft) => {
                  if (isLockedCreateDay(focusDate)) return;
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
