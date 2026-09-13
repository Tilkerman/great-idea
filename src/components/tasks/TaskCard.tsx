import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Task, TaskCategory } from '../../types';
import { CATEGORY_META } from '../../constants/categories';
import './TaskCard.css';

const HOLD_MS = 260;
const MOVE_CANCEL = 12;
const SWIPE_MAX = 64;
/** Галочка видна примерно с 20px — этого достаточно, чтобы завершить. */
const SWIPE_DONE = 20;

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
  const [armed, setArmed] = useState(false);
  const [dx, setDx] = useState(0);

  const clearHold = () => {
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  const resetSwipe = () => {
    clearHold();
    drag.current = null;
    armedRef.current = false;
    dxRef.current = 0;
    doneRef.current = false;
    setArmed(false);
    setDx(0);
  };

  useEffect(() => () => clearHold(), []);

  const onPointerDown = (e: ReactPointerEvent) => {
    const t = e.target as HTMLElement | null;
    if (t?.closest('button')) return;
    clearTextSelection();
    if (!canSwipe || e.button !== 0) return;
    e.stopPropagation();
    skipClick.current = false;
    armedRef.current = false;
    doneRef.current = false;
    dxRef.current = 0;
    setArmed(false);
    setDx(0);
    const id = e.pointerId;
    const x = e.clientX;
    const y = e.clientY;
    drag.current = { id, x, y };
    clearHold();
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = null;
      if (!drag.current || drag.current.id !== id) return;
      armedRef.current = true;
      skipClick.current = true;
      setArmed(true);
      clearTextSelection();
      try { cardRef.current?.setPointerCapture(id); } catch { /* ignore */ }
    }, HOLD_MS);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const start = drag.current;
    if (!start || start.id !== e.pointerId) return;
    const rawX = e.clientX - start.x;
    const rawY = e.clientY - start.y;
    if (!armedRef.current) {
      if (Math.hypot(rawX, rawY) > MOVE_CANCEL) resetSwipe();
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    skipClick.current = true;
    const next = Math.max(0, Math.min(SWIPE_MAX, rawX));
    dxRef.current = next;
    setDx(next);
    if (!doneRef.current && next >= SWIPE_DONE) {
      doneRef.current = true;
      onComplete?.();
    }
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    const start = drag.current;
    if (!start || start.id !== e.pointerId) return;
    const shouldComplete = !doneRef.current && armedRef.current && dxRef.current >= SWIPE_DONE;
    if (armedRef.current) e.stopPropagation();
    resetSwipe();
    if (shouldComplete) onComplete?.();
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
        dx > 0 && 'task-card--swiping',
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
      {canSwipe && dx > 0 && (
        <span className="task-card__swipe-reveal" aria-hidden>
          ✓
        </span>
      )}
      <div
        className="task-card__swipe-inner"
        style={dx ? { transform: `translateX(${dx}px)` } : undefined}
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
              aria-label="Удалить"
            >
              <span className="task-card__delete-mark" aria-hidden>×</span>
            </button>
          )}
          {onComplete && !completed && !slot && (
            <button
              type="button"
              className="task-card__complete"
              onClick={(e) => { e.stopPropagation(); onComplete(); }}
              aria-label="Завершить"
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
