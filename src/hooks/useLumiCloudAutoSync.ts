import { useCallback, useEffect, useRef } from 'react';
import type { UserSession } from '../types';
import { isCloudAccountEnabled } from '../utils/accountApi';
import {
  dispatchLumiCloudSynced,
  registerLumiCloudDirtyNotifier,
} from '../utils/lumiCloudDirty';
import {
  clearCloudDataDirty,
  consumePendingLumiUpload,
  isCloudDataDirty,
  markCloudDataDirty,
  peekPendingLumiUpload,
  readCloudDataOwner,
  writeCloudDataOwner,
} from '../utils/cloudSyncPending';
import { canPushLocalSnapshot, decideCloudBootstrap } from '../utils/cloudSyncPolicy';
import {
  mergeLumiSnapshots,
  pullLumiFromCloud,
  pushLumiToCloud,
  readLocalLumiSnapshot,
  readLumiSyncRevision,
  replaceLocalLumiSnapshot,
  writeLumiSyncRevision,
  type LumiSnapshot,
} from '../utils/lumiSync';

const PUSH_DEBOUNCE_MS = 2_500;
const PULL_INTERVAL_MS = 25_000;

function cloudSyncActive(session: UserSession): boolean {
  return isCloudAccountEnabled() && !session.isGuest && session.emailVerified === true;
}

function snapshotEmpty(snapshot: LumiSnapshot): boolean {
  return snapshot.desires.length === 0
    && snapshot.contacts.length === 0
    && snapshot.actionItems.length === 0
    && snapshot.feedbacks.length === 0;
}

export function useLumiCloudAutoSync(session: UserSession) {
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

  const applyRemoteSnapshot = useCallback(async (revision: number, snapshot: LumiSnapshot) => {
    const apply = replaceQueue.current.then(async () => {
      if (!isCurrentAccount()) return;
      await replaceLocalLumiSnapshot(snapshot);
      if (!isCurrentAccount()) return;
      writeLumiSyncRevision(revision, accountEmail);
      writeCloudDataOwner('lumi', accountEmail);
      clearCloudDataDirty('lumi', accountEmail);
      consumePendingLumiUpload(accountEmail);
      dispatchLumiCloudSynced();
    });
    replaceQueue.current = apply.catch(() => undefined);
    await apply;
  }, [accountEmail, isCurrentAccount]);

  const markSynced = useCallback((revision: number) => {
    writeLumiSyncRevision(revision, accountEmail);
    writeCloudDataOwner('lumi', accountEmail);
    clearCloudDataDirty('lumi', accountEmail);
    consumePendingLumiUpload(accountEmail);
  }, [accountEmail]);

  const pushSnapshot = useCallback(async (snapshot: LumiSnapshot, baseRevision: number) => {
    if (!canPushLocalSnapshot(accountEmail, readCloudDataOwner('lumi'), peekPendingLumiUpload(accountEmail))) {
      return;
    }
    let result = await pushLumiToCloud(snapshot, baseRevision);
    if (!isCurrentAccount()) return;
    if ('conflict' in result && result.conflict) {
      const merged = mergeLumiSnapshots(result.snapshot, await readLocalLumiSnapshot());
      await replaceLocalLumiSnapshot(merged);
      dispatchLumiCloudSynced();
      if (!isCurrentAccount()) return;
      result = await pushLumiToCloud(merged, result.revision);
      if (!isCurrentAccount()) return;
      if ('conflict' in result && result.conflict) {
        await applyRemoteSnapshot(result.revision, mergeLumiSnapshots(result.snapshot, merged));
        return;
      }
    }
    markSynced(result.revision);
  }, [accountEmail, applyRemoteSnapshot, isCurrentAccount, markSynced]);

  const reconcile = useCallback(async () => {
    if (!active || !isCurrentAccount()) return;
    if (busyAccount.current === accountEmail) return;
    busyAccount.current = accountEmail;
    try {
      const remote = await pullLumiFromCloud();
      if (!remote || !isCurrentAccount()) return;
      const local = await readLocalLumiSnapshot();
      if (!isCurrentAccount()) return;
      const action = decideCloudBootstrap({
        accountEmail,
        localOwnerEmail: readCloudDataOwner('lumi'),
        pendingUpload: peekPendingLumiUpload(accountEmail),
        localDirty: isCloudDataDirty('lumi', accountEmail),
        localEmpty: snapshotEmpty(local),
        localRevision: readLumiSyncRevision(accountEmail),
        remoteRevision: remote.revision,
      });

      if (action === 'idle') return;
      if (action === 'apply-remote') {
        await applyRemoteSnapshot(remote.revision, remote.snapshot);
        return;
      }
      if (action === 'merge-and-push') {
        const merged = mergeLumiSnapshots(remote.snapshot, local);
        await replaceLocalLumiSnapshot(merged);
        dispatchLumiCloudSynced();
        await pushSnapshot(merged, remote.revision);
        return;
      }
      await pushSnapshot(local, readLumiSyncRevision(accountEmail));
    } catch (err) {
      console.warn('[lumi-sync] reconcile failed', err);
    } finally {
      if (busyAccount.current === accountEmail) busyAccount.current = '';
    }
  }, [active, accountEmail, applyRemoteSnapshot, isCurrentAccount, pushSnapshot]);

  const schedulePush = useCallback(() => {
    if (!active) return;
    markCloudDataDirty('lumi', accountEmail);
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      pushTimer.current = null;
      void reconcile();
    }, PUSH_DEBOUNCE_MS);
  }, [active, accountEmail, reconcile]);

  useEffect(() => {
    registerLumiCloudDirtyNotifier(schedulePush);
    return () => registerLumiCloudDirtyNotifier(null);
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
