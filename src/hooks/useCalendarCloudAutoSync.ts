import { useCallback, useEffect, useRef } from 'react';
import type { UserSession } from '../types';
import { getAllTasks, replaceAllTasks } from '../db';
import { isCloudAccountEnabled } from '../utils/accountApi';
import {
  pullCalendarFromCloud,
  pushCalendarToCloud,
  readCalendarSyncRevision,
  writeCalendarSyncRevision,
} from '../utils/calendarSync';

const PUSH_DEBOUNCE_MS = 2_500;
const PULL_INTERVAL_MS = 25_000;

let schedulePushRef: (() => void) | null = null;

/** Call after any local calendar task mutation (cloud account). */
export function notifyCalendarCloudDirty() {
  schedulePushRef?.();
}

function cloudSyncActive(session: UserSession): boolean {
  return isCloudAccountEnabled() && !session.isGuest && session.emailVerified === true;
}

export function useCalendarCloudAutoSync(session: UserSession, refreshTasks: () => Promise<void>) {
  const active = cloudSyncActive(session);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busy = useRef(false);

  const applyRemoteSnapshot = useCallback(async (revision: number, snapshot: Awaited<ReturnType<typeof getAllTasks>>) => {
    await replaceAllTasks(snapshot);
    writeCalendarSyncRevision(revision);
    await refreshTasks();
  }, [refreshTasks]);

  const pullRemote = useCallback(async () => {
    if (!active || busy.current) return;
    busy.current = true;
    try {
      const remote = await pullCalendarFromCloud();
      if (!remote) return;
      const localRev = readCalendarSyncRevision();
      if (remote.revision > localRev) {
        await applyRemoteSnapshot(remote.revision, remote.snapshot);
      }
    } catch (err) {
      console.warn('[calendar-sync] pull failed', err);
    } finally {
      busy.current = false;
    }
  }, [active, applyRemoteSnapshot]);

  const pushLocal = useCallback(async () => {
    if (!active || busy.current) return;
    busy.current = true;
    try {
      const tasks = await getAllTasks();
      const baseRevision = readCalendarSyncRevision();
      const result = await pushCalendarToCloud(tasks, baseRevision);
      if ('conflict' in result && result.conflict) {
        await applyRemoteSnapshot(result.revision, result.snapshot);
      } else {
        writeCalendarSyncRevision(result.revision);
      }
    } catch (err) {
      console.warn('[calendar-sync] push failed', err);
    } finally {
      busy.current = false;
    }
  }, [active, applyRemoteSnapshot]);

  const schedulePush = useCallback(() => {
    if (!active) return;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      pushTimer.current = null;
      void pushLocal();
    }, PUSH_DEBOUNCE_MS);
  }, [active, pushLocal]);

  useEffect(() => {
    schedulePushRef = schedulePush;
    return () => {
      schedulePushRef = null;
    };
  }, [schedulePush]);

  useEffect(() => {
    if (!active) return;

    void (async () => {
      try {
        const remote = await pullCalendarFromCloud();
        if (!remote) return;
        const localTasks = await getAllTasks();
        const localRev = readCalendarSyncRevision();

        if (remote.revision === 0 && remote.snapshot.length === 0 && localTasks.length > 0) {
          await pushLocal();
          return;
        }
        if (remote.revision > localRev) {
          await applyRemoteSnapshot(remote.revision, remote.snapshot);
          return;
        }
        if (localTasks.length > 0 && remote.revision === localRev) {
          schedulePush();
        }
      } catch (err) {
        console.warn('[calendar-sync] bootstrap failed', err);
      }
    })();
  }, [active, session.email, applyRemoteSnapshot, pushLocal, schedulePush]);

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      void pullRemote();
    }, PULL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [active, pullRemote]);

  useEffect(() => {
    if (!active) return;
    const onVis = () => {
      if (document.visibilityState !== 'visible') return;
      void pullRemote();
      schedulePush();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [active, pullRemote, schedulePush]);
}
