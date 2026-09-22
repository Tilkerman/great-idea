import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { notificationPermission, reminderNoticeBody, showTiliNotification } from '../utils/notifications';
import { tLocale } from '../i18n/catalog';
import { cloudPushConfigured, subscribeTiliPush, syncCloudReminders } from '../utils/webPush';
import { reminderFireAtMs, alreadyCloudDueNow, markCloudDueNowSent } from '../utils/reminderTime';

const MAX_DELAY_MS = 12 * 60 * 60 * 1000;

export function useTaskReminders() {
  const { ready, tasks, settings, updateSettings } = useApp();
  const fired = useRef(new Set<string>());

  useEffect(() => {
    if (!ready) return;
    if (notificationPermission() !== 'granted') return;

    let cancelled = false;
    const timers: number[] = [];

    const armLocal = () => {
      const now = Date.now();
      for (const task of tasks) {
        const at = reminderFireAtMs(task);
        if (at == null) continue;
        const delay = at - now;
        const key = `${task.id}-${at}`;
        if (fired.current.has(key)) continue;
        if (delay > MAX_DELAY_MS) continue;
        if (delay <= 0) {
          const start = new Date(task.startAt).getTime();
          if (!Number.isFinite(start) || start <= now) continue;
          if (alreadyCloudDueNow(task.id)) continue;
          fired.current.add(key);
          markCloudDueNowSent([task.id]);
          const title = task.title.trim() || tLocale(settings.locale, 'untitledTask');
          void showTiliNotification(title, reminderNoticeBody(settings.locale), `task-${task.id}`);
          continue;
        }
        const id = window.setTimeout(() => {
          fired.current.add(key);
          const title = task.title.trim() || tLocale(settings.locale, 'untitledTask');
          void showTiliNotification(title, reminderNoticeBody(settings.locale), `task-${task.id}`);
        }, delay);
        timers.push(id);
      }
    };

    const boot = async () => {
      if (!settings.notificationsEnabled) {
        await updateSettings({ notificationsEnabled: true });
      }
      if (cloudPushConfigured()) {
        await subscribeTiliPush();
        if (cancelled) return;
        await syncCloudReminders(tasks, settings.locale);
      }
      if (cancelled) return;
      armLocal();
    };

    void boot();

    return () => {
      cancelled = true;
      for (const id of timers) window.clearTimeout(id);
    };
  }, [ready, tasks, settings.notificationsEnabled, settings.locale, updateSettings]);
}
