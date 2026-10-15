import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { notificationPermission, reminderNoticeBody, showTiliNotification } from '../utils/notifications';
import { tLocale } from '../i18n/catalog';
import { cloudPushConfigured, subscribeTiliPush, refreshCloudReminders } from '../utils/webPush';
import { reminderFireAtMs, alreadyCloudDueNow, markCloudDueNowSent, reminderStillInSlot } from '../utils/reminderTime';

const MAX_DELAY_MS = 12 * 60 * 60 * 1000;

export function useTaskReminders() {
  const { ready, tasks, settings } = useApp();
  const fired = useRef(new Set<string>());

  useEffect(() => {
    if (!ready) return;
    if (notificationPermission() !== 'granted') return;
    if (!settings.notificationsEnabled) return;

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
          if (alreadyCloudDueNow(task.id) || !reminderStillInSlot(task, now)) continue;
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

    const flushReminders = () => {
      if (!cloudPushConfigured()) return;
      void refreshCloudReminders(settings.locale);
    };

    const syncCloud = () => {
      if (cancelled || !cloudPushConfigured()) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        flushReminders();
        return;
      }
      void subscribeTiliPush().then((result) => {
        if (result !== 'ok') return;
        flushReminders();
      });
    };

    armLocal();
    syncCloud();
    const delayed = window.setTimeout(syncCloud, 600);
    const onHide = () => flushReminders();
    document.addEventListener('visibilitychange', syncCloud);
    window.addEventListener('pageshow', syncCloud);
    window.addEventListener('pagehide', onHide);
    const onTap = () => {
      document.removeEventListener('pointerdown', onTap, true);
      syncCloud();
    };
    document.addEventListener('pointerdown', onTap, true);

    return () => {
      cancelled = true;
      flushReminders();
      window.clearTimeout(delayed);
      document.removeEventListener('visibilitychange', syncCloud);
      window.removeEventListener('pageshow', syncCloud);
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('pointerdown', onTap, true);
      for (const id of timers) window.clearTimeout(id);
    };
  }, [ready, tasks, settings.notificationsEnabled, settings.locale]);
}
