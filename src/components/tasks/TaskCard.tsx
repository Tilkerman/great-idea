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
}

export function TaskCard({
  task,
  compact,
  slot,
  density = 'single',
  onClick,
  onComplete,
  onDelete,
}: TaskCardProps) {
  const meta = CATEGORY_META[task.category];
  const completed = task.status === 'completed';
  const showDesc = slot ? density === 'single' || density === 'double' : !compact;

  return (
    <div
      className={[
        'task-card',
        completed && 'task-card--done',
        compact && 'task-card--compact',
        slot && 'task-card--slot',
        slot && `task-card--slot-${density}`,
      ].filter(Boolean).join(' ')}
      style={{ background: meta.bg, color: meta.text }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      <div className="task-card__row">
        <span className="task-card__badge" style={{ background: meta.dot }}>
          {task.order}
        </span>
        <div className="task-card__body">
          <span className={`task-card__title ${completed ? 'task-card__title--strike' : ''}`}>
            {task.title}
          </span>
          {showDesc && task.description && (
            <p className="task-card__desc">{task.description}</p>
          )}
        </div>
        {onDelete && (
          <button
            type="button"
            className="task-card__delete"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            aria-label="Удалить"
          >
            ×
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
