import type { Task, TaskCategory } from '../../types';
import { CATEGORY_META } from '../../constants/categories';
import './TaskCard.css';

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
}: TaskCardProps) {
  const meta = CATEGORY_META[task.category];
  const completed = task.status === 'completed';
  const showDesc = showDescProp && showTitle && (slot ? density === 'single' || density === 'double' : !compact);
  const showMark = showBadge || completed;

  return (
    <div
      className={[
        'task-card',
        completed && 'task-card--done',
        compact && 'task-card--compact',
        slot && 'task-card--slot',
        slot && `task-card--slot-${density}`,
        slot && !showMark && 'task-card--no-badge',
        slot && !showTitle && 'task-card--no-title',
        slot && !onDelete && 'task-card--no-delete',
      ].filter(Boolean).join(' ')}
      style={{
        ['--task-bg' as string]: meta.bg,
        ['--task-text' as string]: meta.text,
        ['--task-dot' as string]: meta.dot,
      }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={task.title}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
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
