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
  onAdd: (draft: Task) => void;
}

export function HourSlot({
  day,
  hour,
  tasks,
  compact,
  onTaskClick,
  onTaskDelete,
  onAdd,
}: HourSlotProps) {
  const count = tasks.length;
  const showAdd = canAddToHour(count);
  const density = count <= 1 ? 'single' : count <= 2 ? 'double' : count <= 3 ? 'triple' : 'quad';

  if (count === 0) {
    return (
      <button
        type="button"
        className={`hour-slot hour-slot--empty ${compact ? 'hour-slot--compact' : ''}`}
        onClick={() => onAdd(createDraftTask(day, hour, []))}
        aria-label="Добавить дело"
      >
        <span className="hour-slot__add-icon">+</span>
      </button>
    );
  }

  return (
    <div className={`hour-slot hour-slot--filled ${compact ? 'hour-slot--compact' : ''}`}>
      <div className={`hour-slot__stack hour-slot__stack--${density}`}>
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            slot
            density={density}
            onClick={() => onTaskClick(task)}
            onDelete={onTaskDelete ? () => onTaskDelete(task) : undefined}
          />
        ))}
      </div>
      {showAdd && (
        <button
          type="button"
          className="hour-slot__add-btn"
          onClick={() => onAdd(createDraftTask(day, hour, tasks))}
          aria-label={`Добавить дело (${count}/${MAX_TASKS_PER_HOUR})`}
        >
          +
        </button>
      )}
    </div>
  );
}
