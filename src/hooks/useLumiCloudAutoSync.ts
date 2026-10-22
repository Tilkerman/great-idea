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
  pullLumiFromCloud,
  pushLumiToCloud,
  readLocalLumiSnapshot,
  readLumiSyncRevision,
  replaceLocalLumiSnapshot,
  writeLumiSyncRevision,
} from '../utils/lumiSync';

const PUSH_DEBOUNCE_MS = 2_500;
const PULL_INTERVAL_MS = 25_000;

function cloudSyncActive(session: UserSession): boolean {
  return isCloudAccountEnabled() && !session.isGuest && session.emailVerified === true;
}

function snapshotEmpty(snapshot: Awaited<ReturnType<typeof readLocalLumiSnapshot>>): boolean {
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

  const applyRemoteSnapshot = useCallback(async (revision: number, snapshot: Awaited<ReturnType<typeof readLocalLumiSnapshot>>) => {
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

  const pullRemote = useCallback(async () => {
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
      if (action === 'apply-remote') {
        await applyRemoteSnapshot(remote.revision, remote.snapshot);
        return;
      }
      if (action === 'push-local') {
        busyAccount.current = '';
        await pushLocalRef.current?.();
      }
    } catch (err) {
      console.warn('[lumi-sync] pull failed', err);
    } finally {
      if (busyAccount.current === accountEmail) busyAccount.current = '';
    }
  }, [active, accountEmail, applyRemoteSnapshot, isCurrentAccount]);

  const pushLocalRef = useRef<(() => Promise<void>) | null>(null);
  const pushLocal = useCallback(async () => {
    if (!active || !isCurrentAccount() || busyAccount.current === accountEmail) return;
    const owner = readCloudDataOwner('lumi');
    if (!canPushLocalSnapshot(accountEmail, owner, peekPendingLumiUpload(accountEmail))) return;
    busyAccount.current = accountEmail;
    try {
      const snapshot = await readLocalLumiSnapshot();
      if (!isCurrentAccount()) return;
      const baseRevision = readLumiSyncRevision(accountEmail);
      const result = await pushLumiToCloud(snapshot, baseRevision);
      if (!isCurrentAccount()) return;
      if ('conflict' in result && result.conflict) {
        await applyRemoteSnapshot(result.revision, result.snapshot);
      } else {
        writeLumiSyncRevision(result.revision, accountEmail);
        writeCloudDataOwner('lumi', accountEmail);
        clearCloudDataDirty('lumi', accountEmail);
        consumePendingLumiUpload(accountEmail);
      }
    } catch (err) {
      console.warn('[lumi-sync] push failed', err);
    } finally {
      if (busyAccount.current === accountEmail) busyAccount.current = '';
    }
  }, [active, accountEmail, applyRemoteSnapshot, isCurrentAccount]);
  pushLocalRef.current = pushLocal;

  const schedulePush = useCallback(() => {
    if (!active) return;
    markCloudDataDirty('lumi', accountEmail);
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      pushTimer.current = null;
      void pushLocal();
    }, PUSH_DEBOUNCE_MS);
  }, [active, accountEmail, pushLocal]);

  useEffect(() => {
    registerLumiCloudDirtyNotifier(schedulePush);
    return () => {
      registerLumiCloudDirtyNotifier(null);
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

        if (action === 'apply-remote') {
          await applyRemoteSnapshot(remote.revision, remote.snapshot);
          return;
        }
        if (action === 'push-local') {
          busyAccount.current = '';
          await pushLocal();
        }
      } catch (err) {
        console.warn('[lumi-sync] bootstrap failed', err);
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
