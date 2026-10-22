import { useCallback, useEffect, useRef } from 'react';
import type { Task, UserSession } from '../types';
import { getAllTasks, replaceAllTasks } from '../db';
import { isCloudAccountEnabled } from '../utils/accountApi';
import {
  clearCloudDataDirty,
  consumePendingCalendarUpload,
  isCloudDataDirty,
  markCloudDataDirty,
  peekPendingCalendarUpload,
  readCloudDataOwner,
  writeCloudDataOwner,
} from '../utils/cloudSyncPending';
import { canPushLocalSnapshot, decideCloudBootstrap, mergeTaskSnapshots } from '../utils/cloudSyncPolicy';
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
  const accountEmail = (session.email ?? '').trim().toLowerCase();
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busyAccount = useRef('');
  const replaceQueue = useRef<Promise<void>>(Promise.resolve());
  const activeAccount = useRef(active ? accountEmail : '');
  activeAccount.current = active ? accountEmail : '';

  const isCurrentAccount = useCallback(
    () => activeAccount.current === accountEmail && accountEmail.length > 0,
    [accountEmail],
  );

  const applyRemoteSnapshot = useCallback(async (revision: number, snapshot: Task[]) => {
    const apply = replaceQueue.current.then(async () => {
      if (!isCurrentAccount()) return;
      await replaceAllTasks(snapshot);
      if (!isCurrentAccount()) return;
      writeCalendarSyncRevision(revision, accountEmail);
      writeCloudDataOwner('calendar', accountEmail);
      clearCloudDataDirty('calendar', accountEmail);
      consumePendingCalendarUpload(accountEmail);
      await refreshTasks();
    });
    replaceQueue.current = apply.catch(() => undefined);
    await apply;
  }, [refreshTasks, accountEmail, isCurrentAccount]);

  const markSynced = useCallback((revision: number) => {
    writeCalendarSyncRevision(revision, accountEmail);
    writeCloudDataOwner('calendar', accountEmail);
    clearCloudDataDirty('calendar', accountEmail);
    consumePendingCalendarUpload(accountEmail);
  }, [accountEmail]);

  const pushSnapshot = useCallback(async (snapshot: Task[], baseRevision: number) => {
    if (!canPushLocalSnapshot(accountEmail, readCloudDataOwner('calendar'), peekPendingCalendarUpload(accountEmail))) {
      return;
    }
    let result = await pushCalendarToCloud(snapshot, baseRevision);
    if (!isCurrentAccount()) return;
    if ('conflict' in result && result.conflict) {
      const merged = mergeTaskSnapshots(result.snapshot, await getAllTasks());
      await replaceAllTasks(merged);
      await refreshTasks();
      if (!isCurrentAccount()) return;
      result = await pushCalendarToCloud(merged, result.revision);
      if (!isCurrentAccount()) return;
      if ('conflict' in result && result.conflict) {
        await applyRemoteSnapshot(result.revision, mergeTaskSnapshots(result.snapshot, merged));
        return;
      }
    }
    markSynced(result.revision);
  }, [accountEmail, applyRemoteSnapshot, isCurrentAccount, markSynced, refreshTasks]);

  const reconcile = useCallback(async () => {
    if (!active || !isCurrentAccount()) return;
    if (busyAccount.current === accountEmail) return;
    busyAccount.current = accountEmail;
    try {
      const remote = await pullCalendarFromCloud();
      if (!remote || !isCurrentAccount()) return;
      const localTasks = await getAllTasks();
      if (!isCurrentAccount()) return;
      const action = decideCloudBootstrap({
        accountEmail,
        localOwnerEmail: readCloudDataOwner('calendar'),
        pendingUpload: peekPendingCalendarUpload(accountEmail),
        localDirty: isCloudDataDirty('calendar', accountEmail),
        localEmpty: localTasks.length === 0,
        localRevision: readCalendarSyncRevision(accountEmail),
        remoteRevision: remote.revision,
      });

      if (action === 'idle') return;
      if (action === 'apply-remote') {
        await applyRemoteSnapshot(remote.revision, remote.snapshot);
        return;
      }
      if (action === 'merge-and-push') {
        const merged = mergeTaskSnapshots(remote.snapshot, localTasks);
        await replaceAllTasks(merged);
        await refreshTasks();
        await pushSnapshot(merged, remote.revision);
        return;
      }
      await pushSnapshot(localTasks, readCalendarSyncRevision(accountEmail));
    } catch (err) {
      console.warn('[calendar-sync] reconcile failed', err);
    } finally {
      if (busyAccount.current === accountEmail) busyAccount.current = '';
    }
  }, [active, accountEmail, applyRemoteSnapshot, isCurrentAccount, pushSnapshot, refreshTasks]);

  const schedulePush = useCallback(() => {
    if (!active) return;
    markCloudDataDirty('calendar', accountEmail);
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      pushTimer.current = null;
      void reconcile();
    }, PUSH_DEBOUNCE_MS);
  }, [active, accountEmail, reconcile]);

  useEffect(() => {
    schedulePushRef = schedulePush;
    return () => {
      if (schedulePushRef === schedulePush) schedulePushRef = null;
    };
  }, [schedulePush]);

  useEffect(() => () => {
    if (pushTimer.current) {
      clearTimeout(pushTimer.current);
      pushTimer.current = null;
    }
  }, [accountEmail]);

  useEffect(() => {
    if (!active) return;
    void reconcile();
  }, [active, accountEmail, reconcile]);

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      void reconcile();
    }, PULL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [active, reconcile]);

  useEffect(() => {
    if (!active) return;
    const onResume = () => {
      if (document.visibilityState === 'hidden') return;
      void reconcile();
    };
    document.addEventListener('visibilitychange', onResume);
    window.addEventListener('pageshow', onResume);
    window.addEventListener('focus', onResume);
    return () => {
      document.removeEventListener('visibilitychange', onResume);
      window.removeEventListener('pageshow', onResume);
      window.removeEventListener('focus', onResume);
    };
  }, [active, reconcile]);
}
