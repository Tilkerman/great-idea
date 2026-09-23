import { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { isUnscheduledTask } from '../utils/hourSlot';

const PENDING_KEY = 'tili-open-task';
const PENDING_LUMI_KEY = 'tili-open-lumi';

function stripQueryParam(name: string) {
  const params = new URLSearchParams(window.location.search);
  if (!params.has(name)) return;
  params.delete(name);
  const q = params.toString();
  history.replaceState(null, '', `${window.location.pathname}${q ? `?${q}` : ''}${window.location.hash}`);
}

function takeTaskIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('task');
  if (id) {
    sessionStorage.setItem(PENDING_KEY, id);
    stripQueryParam('task');
  }
  return sessionStorage.getItem(PENDING_KEY);
}

function takeLumiFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('lumi') === '1') {
    sessionStorage.setItem(PENDING_LUMI_KEY, '1');
    stripQueryParam('lumi');
  }
  return sessionStorage.getItem(PENDING_LUMI_KEY) === '1';
}

export function useOpenTaskFromNotification() {
  const {
    ready, tasks, setScreen, setZoom, setFocusDate, setEditingTask, setSheetOpen,
  } = useApp();

  useEffect(() => {
    if (!ready) return;

    const openLumi = () => {
      sessionStorage.removeItem(PENDING_LUMI_KEY);
      setScreen('lumi');
    };

    const openTask = (taskId: string) => {
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

    if (takeLumiFromUrl()) openLumi();
    const pending = takeTaskIdFromUrl();
    if (pending) openTask(pending);

    const onSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'tili-open-lumi') {
        sessionStorage.setItem(PENDING_LUMI_KEY, '1');
        openLumi();
        return;
      }
      if (event.data?.type === 'tili-open-task' && typeof event.data.taskId === 'string') {
        sessionStorage.setItem(PENDING_KEY, event.data.taskId);
        openTask(event.data.taskId);
      }
    };
    const onLocal = (event: Event) => {
      const taskId = (event as CustomEvent<string>).detail;
      if (typeof taskId === 'string' && taskId) {
        sessionStorage.setItem(PENDING_KEY, taskId);
        openTask(taskId);
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
