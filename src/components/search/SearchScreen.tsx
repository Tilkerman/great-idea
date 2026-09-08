import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TaskCard } from '../tasks/TaskCard';
import { CATEGORY_META } from '../../constants/categories';
import type { TaskCategory } from '../../types';
import '../settings/Settings.css';

export function SearchScreen() {
  const { setScreen, tasks, setEditingTask, setSheetOpen } = useApp();
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<TaskCategory | 'all'>('all');

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (cat !== 'all' && t.category !== cat) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q);
    });
  }, [tasks, query, cat]);

  return (
    <div className="settings-page search-page">
      <header className="settings-topbar">
        <button type="button" onClick={() => setScreen('calendar')}>‹ Назад</button>
        <span>Поиск</span>
        <span />
      </header>
      <div className="search-bar-wrap">
        <input
          className="search-input"
          placeholder="Найти задачу..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <div className="search-filters">
          <button type="button" className={`search-chip ${cat === 'all' ? 'active' : ''}`} onClick={() => setCat('all')}>Все</button>
          {(Object.keys(CATEGORY_META) as TaskCategory[]).map((c) => (
            <button
              key={c}
              type="button"
              className={`search-chip ${cat === c ? 'active' : ''}`}
              onClick={() => setCat(c)}
            >
              {CATEGORY_META[c].label.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>
      <div className="search-results">
        {filtered.length === 0 ? (
          <p className="search-empty">Ничего не найдено</p>
        ) : (
          filtered.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => {
                setEditingTask(task);
                setSheetOpen(true);
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
