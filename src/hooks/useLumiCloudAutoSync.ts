import { useCallback, useEffect, useRef } from 'react';
import type { UserSession } from '../types';
import { isCloudAccountEnabled } from '../utils/accountApi';
import {
  dispatchLumiCloudSynced,
  registerLumiCloudDirtyNotifier,
} from '../utils/lumiCloudDirty';
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
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busy = useRef(false);

  const applyRemoteSnapshot = useCallback(async (revision: number, snapshot: Awaited<ReturnType<typeof readLocalLumiSnapshot>>) => {
    await replaceLocalLumiSnapshot(snapshot);
    writeLumiSyncRevision(revision);
    dispatchLumiCloudSynced();
  }, []);

  const pullRemote = useCallback(async () => {
    if (!active || busy.current) return;
    busy.current = true;
    try {
      const remote = await pullLumiFromCloud();
      if (!remote) return;
      const localRev = readLumiSyncRevision();
      if (remote.revision > localRev) {
        await applyRemoteSnapshot(remote.revision, remote.snapshot);
      }
    } catch (err) {
      console.warn('[lumi-sync] pull failed', err);
    } finally {
      busy.current = false;
    }
  }, [active, applyRemoteSnapshot]);

  const pushLocal = useCallback(async () => {
    if (!active || busy.current) return;
    busy.current = true;
    try {
      const snapshot = await readLocalLumiSnapshot();
      const baseRevision = readLumiSyncRevision();
      const result = await pushLumiToCloud(snapshot, baseRevision);
      if ('conflict' in result && result.conflict) {
        await applyRemoteSnapshot(result.revision, result.snapshot);
      } else {
        writeLumiSyncRevision(result.revision);
      }
    } catch (err) {
      console.warn('[lumi-sync] push failed', err);
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
    registerLumiCloudDirtyNotifier(schedulePush);
    return () => registerLumiCloudDirtyNotifier(null);
  }, [schedulePush]);

  useEffect(() => {
    if (!active) return;

    void (async () => {
      try {
        const remote = await pullLumiFromCloud();
        if (!remote) return;
        const local = await readLocalLumiSnapshot();
        const localRev = readLumiSyncRevision();

        if (remote.revision === 0 && snapshotEmpty(remote.snapshot) && !snapshotEmpty(local)) {
          await pushLocal();
          return;
        }
        if (remote.revision > localRev) {
          await applyRemoteSnapshot(remote.revision, remote.snapshot);
          return;
        }
        if (!snapshotEmpty(local) && remote.revision === localRev) {
          schedulePush();
        }
      } catch (err) {
        console.warn('[lumi-sync] bootstrap failed', err);
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
