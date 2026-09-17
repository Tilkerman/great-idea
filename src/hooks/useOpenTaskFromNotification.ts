import { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { isUnscheduledTask } from '../utils/hourSlot';

const PENDING_KEY = 'tili-open-task';

function takeTaskIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('task');
  if (id) {
    sessionStorage.setItem(PENDING_KEY, id);
    params.delete('task');
    const q = params.toString();
    history.replaceState(null, '', `${window.location.pathname}${q ? `?${q}` : ''}${window.location.hash}`);
  }
  return sessionStorage.getItem(PENDING_KEY);
}

export function useOpenTaskFromNotification() {
  const {
    ready, tasks, setScreen, setZoom, setFocusDate, setEditingTask, setSheetOpen,
  } = useApp();

  useEffect(() => {
    if (!ready) return;

    const open = (taskId: string) => {
      const task = tasks.find((row) => row.id === taskId);
      if (!task) return false;
      sessionStorage.removeItem(PENDING_KEY);
      setScreen('calendar');
      setZoom('week');
      if (!isUnscheduledTask(task)) setFocusDate(new Date(task.startAt));
      setEditingTask(task);
      setSheetOpen(true);
      return true;
    };

    const pending = takeTaskIdFromUrl();
    if (pending) open(pending);

    const onSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'tili-open-task' && typeof event.data.taskId === 'string') {
        sessionStorage.setItem(PENDING_KEY, event.data.taskId);
        open(event.data.taskId);
      }
    };
    const onLocal = (event: Event) => {
      const taskId = (event as CustomEvent<string>).detail;
      if (typeof taskId === 'string' && taskId) {
        sessionStorage.setItem(PENDING_KEY, taskId);
        open(taskId);
      }
    };
    navigator.serviceWorker?.addEventListener('message', onSwMessage);
    window.addEventListener('tili-open-task', onLocal);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', onSwMessage);
      window.removeEventListener('tili-open-task', onLocal);
    };
  }, [ready, tasks, setScreen, setZoom, setFocusDate, setEditingTask, setSheetOpen]);
}
