import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Task, TaskCategory } from '../../types';
import { CATEGORY_META } from '../../constants/categories';
import { useI18n } from '../../i18n/useI18n';
import './TaskCard.css';

const HOLD_MS = 260;
const AXIS_X = 10;
const AXIS_Y = 12;

function swipeCommitPx(width: number) {
  if (width <= 0) return 56;
  return Math.round(Math.min(Math.max(width * 0.38, 40), width * 0.72));
}

function clearTextSelection() {
  window.getSelection()?.removeAllRanges();
}

interface TaskCardProps {
  task: Task;
  compact?: boolean;
  slot?: boolean;
  density?: 'single' | 'double' | 'triple' | 'quad';
  onClick?: () => void;
  onComplete?: () => void;
  onDelete?: () => void;
  showBadge?: boolean;
  showTitle?: boolean;
  showDesc?: boolean;
  /** Свайп вправо завершает дело (не удаляет). */
  swipeComplete?: boolean;
}

export function TaskCard({
  task,
  compact,
  slot,
  density = 'single',
  onClick,
  onComplete,
  onDelete,
  showBadge = true,
  showTitle = true,
  showDesc: showDescProp = true,
  swipeComplete = false,
}: TaskCardProps) {
  const { t } = useI18n();
  const meta = CATEGORY_META[task.category];
  const completed = task.status === 'completed';
  const canSwipe = Boolean(swipeComplete && onComplete && !completed);
  const showDesc = showDescProp && showTitle && (slot ? density === 'single' || density === 'double' : !compact);
  const showMark = showBadge || completed;

  const cardRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const armedRef = useRef(false);
  const dxRef = useRef(0);
  const skipClick = useRef(false);
  const doneRef = useRef(false);
  const holdTimer = useRef<number | null>(null);
  const finishTimer = useRef<number | null>(null);
  const lockedRef = useRef<'none' | 'h' | 'v'>('none');
  const [armed, setArmed] = useState(false);
  const [dx, setDx] = useState(0);
  const [settle, setSettle] = useState<'none' | 'back' | 'out'>('none');

  const clearHold = () => {
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  const resetSwipe = () => {
    clearHold();
    if (finishTimer.current !== null) {
      window.clearTimeout(finishTimer.current);
      finishTimer.current = null;
    }
    drag.current = null;
    armedRef.current = false;
    lockedRef.current = 'none';
    dxRef.current = 0;
    doneRef.current = false;
    setArmed(false);
    setDx(0);
    setSettle('none');
  };

  const armSwipe = (pointerId: number) => {
    if (armedRef.current || doneRef.current) return;
    armedRef.current = true;
    lockedRef.current = 'h';
    skipClick.current = true;
    clearHold();
    setArmed(true);
    clearTextSelection();
    try { cardRef.current?.setPointerCapture(pointerId); } catch { /* ignore */ }
  };

  const pullTo = (rawX: number) => {
    const width = cardRef.current?.offsetWidth ?? 0;
    const next = Math.max(0, Math.min(width, rawX));
    dxRef.current = next;
    setDx(next);
    setSettle('none');
  };

  useEffect(() => () => {
    clearHold();
    if (finishTimer.current !== null) window.clearTimeout(finishTimer.current);
  }, []);

  useEffect(() => {
    const el = cardRef.current;
    if (!canSwipe || !el) return;
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const start = drag.current;
      if (!start) return;
      const touch = e.touches[0];
      const rawX = touch.clientX - start.x;
      const rawY = touch.clientY - start.y;
      if (lockedRef.current === 'v') return;
      if (!armedRef.current) {
        if (Math.abs(rawY) > AXIS_Y && Math.abs(rawY) >= Math.abs(rawX)) {
          lockedRef.current = 'v';
          clearHold();
          return;
        }
        if (rawX > AXIS_X && rawX > Math.abs(rawY)) {
          e.preventDefault();
          armSwipe(start.id);
          pullTo(rawX);
        }
        return;
      }
      e.preventDefault();
      pullTo(rawX);
    };
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => el.removeEventListener('touchmove', onTouchMove);
  }, [canSwipe]);

  const onPointerDown = (e: ReactPointerEvent) => {
    const hit = e.target as HTMLElement | null;
    if (hit?.closest('button')) return;
    clearTextSelection();
    if (!canSwipe || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.stopPropagation();
    skipClick.current = false;
    armedRef.current = false;
    lockedRef.current = 'none';
    doneRef.current = false;
    dxRef.current = 0;
    setArmed(false);
    setDx(0);
    setSettle('none');
    const id = e.pointerId;
    drag.current = { id, x: e.clientX, y: e.clientY };
    clearHold();
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = null;
      if (!drag.current || drag.current.id !== id) return;
      if (lockedRef.current === 'v') return;
      armSwipe(id);
    }, HOLD_MS);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const start = drag.current;
    if (!start || start.id !== e.pointerId) return;
    if (e.pointerType === 'touch') return;
    const rawX = e.clientX - start.x;
    const rawY = e.clientY - start.y;
    if (lockedRef.current === 'v') return;
    if (!armedRef.current) {
      if (Math.abs(rawY) > AXIS_Y && Math.abs(rawY) >= Math.abs(rawX)) {
        lockedRef.current = 'v';
        clearHold();
        return;
      }
      if (rawX > AXIS_X && rawX > Math.abs(rawY)) armSwipe(e.pointerId);
      else return;
    }
    e.preventDefault();
    e.stopPropagation();
    skipClick.current = true;
    pullTo(rawX);
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    const start = drag.current;
    if (!start || start.id !== e.pointerId) return;
    if (armedRef.current) e.stopPropagation();
    const width = cardRef.current?.offsetWidth ?? 0;
    const pulled = dxRef.current;
    const need = swipeCommitPx(width);
    const finish = Boolean(armedRef.current && pulled >= need && onComplete && !doneRef.current);
    drag.current = null;
    armedRef.current = false;
    clearHold();
    skipClick.current = skipClick.current || finish || pulled > 8;
    if (finish) {
      doneRef.current = true;
      setArmed(false);
      setSettle('out');
      setDx(width);
      finishTimer.current = window.setTimeout(() => {
        finishTimer.current = null;
        onComplete?.();
        dxRef.current = 0;
        setDx(0);
        setSettle('none');
      }, 200);
      return;
    }
    if (pulled > 0) {
      setArmed(false);
      setSettle('back');
      setDx(0);
      dxRef.current = 0;
      finishTimer.current = window.setTimeout(() => {
        finishTimer.current = null;
        setSettle('none');
      }, 200);
      return;
    }
    resetSwipe();
  };

  return (
    <div
      ref={cardRef}
      className={[
        'task-card',
        completed && 'task-card--done',
        compact && 'task-card--compact',
        slot && 'task-card--slot',
        slot && `task-card--slot-${density}`,
        slot && !showMark && 'task-card--no-badge',
        slot && !showTitle && 'task-card--no-title',
        slot && !onDelete && 'task-card--no-delete',
        canSwipe && 'task-card--swipeable',
        armed && 'task-card--armed',
        (armed || dx > 0) && settle === 'none' && 'task-card--swiping',
        settle === 'back' && 'task-card--swipe-back',
        settle === 'out' && 'task-card--swipe-out',
      ].filter(Boolean).join(' ')}
      style={{
        ['--task-bg' as string]: meta.bg,
        ['--task-text' as string]: meta.text,
        ['--task-dot' as string]: meta.dot,
      }}
      onClick={() => {
        if (skipClick.current) return;
        onClick?.();
      }}
      role="button"
      tabIndex={0}
      aria-label={task.title}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      onContextMenu={(e) => { e.preventDefault(); }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {canSwipe && (armed || dx > 0) && (
        <span className="task-card__swipe-reveal" aria-hidden>
          ✓
        </span>
      )}
      <div
        className="task-card__swipe-inner"
        style={(armed || dx > 0 || settle !== 'none') ? { transform: `translateX(${dx}px)` } : undefined}
      >
        <div className="task-card__row">
          {showMark && (
            <span className={`task-card__badge ${completed ? 'task-card__badge--done' : ''}`}>
              {completed ? (
                <svg className="task-card__check" viewBox="0 0 12 12" aria-hidden>
                  <path
                    d="M2.2 6.2 4.8 8.8 9.8 3.2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                task.order
              )}
            </span>
          )}
          <div className="task-card__body">
            {showTitle && (
              <span className={`task-card__title ${completed ? 'task-card__title--strike' : ''}`}>
                {task.title}
              </span>
            )}
            {showDesc && task.description && (
              <p className="task-card__desc">{task.description}</p>
            )}
            {task.lumiDesireId && (
              <span className="task-card__lumi">
                ✦ {task.lumiDesireTitle?.trim() || 'Lumi'}
              </span>
            )}
          </div>
          {onDelete && (
            <button
              type="button"
              className="task-card__delete"
              onPointerDown={(e) => { e.stopPropagation(); }}
              onTouchStart={(e) => { e.stopPropagation(); }}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onDelete();
              }}
              aria-label={t('delete')}
            >
              <span className="task-card__delete-mark" aria-hidden>×</span>
            </button>
          )}
          {onComplete && !completed && !slot && (
            <button
              type="button"
              className="task-card__complete"
              onClick={(e) => { e.stopPropagation(); onComplete(); }}
              aria-label={t('complete')}
            >
              ✓
            </button>
          )}
          {task.important && <span className="task-card__important">!</span>}
        </div>
      </div>
    </div>
  );
}

export function CategoryDot({ category }: { category: TaskCategory }) {
  return (
    <span
      className="category-dot"
      style={{ background: CATEGORY_META[category].dot }}
    />
  );
}
