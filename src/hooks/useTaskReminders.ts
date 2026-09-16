import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { notificationPermission, showTiliNotification } from '../utils/notifications';
import { cloudPushConfigured, syncCloudReminders } from '../utils/webPush';

const MAX_DELAY_MS = 12 * 60 * 60 * 1000;

export function useTaskReminders() {
  const { ready, tasks, settings } = useApp();
  const fired = useRef(new Set<string>());

  useEffect(() => {
    if (!ready || !settings.notificationsEnabled) return;
    if (notificationPermission() !== 'granted') return;

    if (cloudPushConfigured()) {
      void syncCloudReminders(tasks, settings.reminderBeforeMin);
    }

    const timers: number[] = [];
    const now = Date.now();

    for (const task of tasks) {
      if (task.status === 'completed') continue;
      const mins = task.reminderOffsetMinutes ?? settings.reminderBeforeMin;
      if (mins < 0) continue;
      const at = new Date(task.startAt).getTime() - mins * 60_000;
      const delay = at - now;
      if (delay <= 0 || delay > MAX_DELAY_MS) continue;
      const key = `${task.id}-${at}`;
      if (fired.current.has(key)) continue;
      const id = window.setTimeout(() => {
        fired.current.add(key);
        const title = task.title.trim() || 'Дело в календаре';
        const when = new Date(task.startAt);
        const hh = String(when.getHours()).padStart(2, '0');
        const mm = String(when.getMinutes()).padStart(2, '0');
        void showTiliNotification(title, `Начало в ${hh}:${mm}`, `task-${task.id}`);
      }, delay);
      timers.push(id);
    }

    return () => {
      for (const id of timers) window.clearTimeout(id);
    };
  }, [ready, tasks, settings.notificationsEnabled, settings.reminderBeforeMin]);
}
