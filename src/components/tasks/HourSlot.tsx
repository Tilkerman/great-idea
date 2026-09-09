import type { Task } from '../../types';
import { canAddToHour, createDraftTask, MAX_TASKS_PER_HOUR } from '../../utils/hourSlot';
import { TaskCard } from './TaskCard';
import './HourSlot.css';

interface HourSlotProps {
  day: Date;
  hour: number;
  tasks: Task[];
  compact?: boolean;
  onTaskClick: (task: Task) => void;
  onTaskDelete?: (task: Task) => void;
  showDelete?: boolean;
  showBadge?: boolean;
  showTitle?: boolean;
  showDesc?: boolean;
  showAddStrip?: boolean;
  onAdd: (draft: Task) => void;
}

export function HourSlot({
  day,
  hour,
  tasks,
  compact,
  onTaskClick,
  onTaskDelete,
  showDelete = true,
  showBadge = true,
  showTitle = true,
  showDesc = true,
  showAddStrip = true,
  onAdd,
}: HourSlotProps) {
  const count = tasks.length;
  const showAdd = canAddToHour(count) && showAddStrip;
  const density = count <= 1 ? 'single' : count <= 2 ? 'double' : count <= 3 ? 'triple' : 'quad';

  const addDraft = () => {
    onAdd(createDraftTask(day, hour, tasks));
  };

  if (count === 0) {
    return (
      <button
        type="button"
        className={`hour-slot hour-slot--empty ${compact ? 'hour-slot--compact' : ''}`}
        onClick={addDraft}
        aria-label="Добавить дело"
      >
        <span className="hour-slot__add-icon">+</span>
      </button>
    );
  }

  return (
    <div className={`hour-slot hour-slot--filled ${compact ? 'hour-slot--compact' : ''} ${showAdd ? 'hour-slot--with-add' : ''}`}>
      <div className={`hour-slot__stack hour-slot__stack--${density}`}>
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            slot
            density={density}
            onClick={() => onTaskClick(task)}
            onDelete={showDelete && onTaskDelete ? () => onTaskDelete(task) : undefined}
            showBadge={showBadge}
            showTitle={showTitle}
            showDesc={showDesc}
          />
        ))}
      </div>
      {showAdd && (
        <button
          type="button"
          className="hour-slot__add-strip"
          onClick={addDraft}
          aria-label={`Добавить дело (${count}/${MAX_TASKS_PER_HOUR})`}
        >
          <span className="hour-slot__add-strip-plus" aria-hidden>+</span>
        </button>
      )}
    </div>
  );
}
