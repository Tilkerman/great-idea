import { useCallback, useEffect, useRef } from 'react';
import type { UserSession } from '../types';
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
import { canPushLocalSnapshot, decideCloudBootstrap } from '../utils/cloudSyncPolicy';
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

  const applyRemoteSnapshot = useCallback(async (revision: number, snapshot: Awaited<ReturnType<typeof getAllTasks>>) => {
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

  const pullRemote = useCallback(async () => {
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
      if (action === 'apply-remote') {
        await applyRemoteSnapshot(remote.revision, remote.snapshot);
        return;
      }
      if (action === 'push-local') {
        busyAccount.current = '';
        await pushLocalRef.current?.();
      }
    } catch (err) {
      console.warn('[calendar-sync] pull failed', err);
    } finally {
      if (busyAccount.current === accountEmail) busyAccount.current = '';
    }
  }, [active, accountEmail, applyRemoteSnapshot, isCurrentAccount]);

  const pushLocalRef = useRef<(() => Promise<void>) | null>(null);
  const pushLocal = useCallback(async () => {
    if (!active || !isCurrentAccount() || busyAccount.current === accountEmail) return;
    const owner = readCloudDataOwner('calendar');
    if (!canPushLocalSnapshot(accountEmail, owner, peekPendingCalendarUpload(accountEmail))) return;
    busyAccount.current = accountEmail;
    try {
      const tasks = await getAllTasks();
      if (!isCurrentAccount()) return;
      const baseRevision = readCalendarSyncRevision(accountEmail);
      const result = await pushCalendarToCloud(tasks, baseRevision);
      if (!isCurrentAccount()) return;
      if ('conflict' in result && result.conflict) {
        await applyRemoteSnapshot(result.revision, result.snapshot);
      } else {
        writeCalendarSyncRevision(result.revision, accountEmail);
        writeCloudDataOwner('calendar', accountEmail);
        clearCloudDataDirty('calendar', accountEmail);
        consumePendingCalendarUpload(accountEmail);
      }
    } catch (err) {
      console.warn('[calendar-sync] push failed', err);
    } finally {
      if (busyAccount.current === accountEmail) busyAccount.current = '';
    }
  }, [active, accountEmail, applyRemoteSnapshot, isCurrentAccount]);
  pushLocalRef.current = pushLocal;

  const schedulePush = useCallback(() => {
    if (!active) return;
    markCloudDataDirty('calendar', accountEmail);
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      pushTimer.current = null;
      void pushLocal();
    }, PUSH_DEBOUNCE_MS);
  }, [active, accountEmail, pushLocal]);

  useEffect(() => {
    schedulePushRef = schedulePush;
    return () => {
      schedulePushRef = null;
      if (pushTimer.current) {
        clearTimeout(pushTimer.current);
        pushTimer.current = null;
      }
    };
  }, [schedulePush]);

  useEffect(() => {
    if (!active) return;

    void (async () => {
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

        if (action === 'apply-remote') {
          await applyRemoteSnapshot(remote.revision, remote.snapshot);
          return;
        }
        if (action === 'push-local') {
          busyAccount.current = '';
          await pushLocal();
        }
      } catch (err) {
        console.warn('[calendar-sync] bootstrap failed', err);
      } finally {
        if (busyAccount.current === accountEmail) busyAccount.current = '';
      }
    })();
  }, [active, accountEmail, applyRemoteSnapshot, isCurrentAccount, pushLocal]);

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
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [active, pullRemote]);
}
