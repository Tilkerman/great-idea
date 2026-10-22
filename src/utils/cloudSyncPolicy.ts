import type { Task } from '../types';

export type CloudBootstrapAction = 'apply-remote' | 'push-local' | 'merge-and-push' | 'idle';

export type CloudBootstrapState = {
  accountEmail: string;
  localOwnerEmail: string;
  pendingUpload: boolean;
  localDirty: boolean;
  localEmpty: boolean;
  localRevision: number;
  remoteRevision: number;
};

function identity(email: string): string {
  return email.trim().toLowerCase();
}

export function canPushLocalSnapshot(
  accountEmail: string,
  localOwnerEmail: string,
  pendingUpload: boolean,
): boolean {
  const account = identity(accountEmail);
  const owner = identity(localOwnerEmail);
  return owner === account || (!owner && pendingUpload);
}

/**
 * The server is authoritative unless this browser explicitly carries a
 * one-time guest migration created during registration.
 *
 * Pending upload may copy local data only into an empty cloud of the same
 * (or still unowned) account. Switching A → B always loads B from the server,
 * even when both revisions are 0 and leftover tasks are still on screen.
 */
export function decideCloudBootstrap(state: CloudBootstrapState): CloudBootstrapAction {
  const account = identity(state.accountEmail);
  const owner = identity(state.localOwnerEmail);
  const emptyCloud = state.remoteRevision === 0;

  if (state.pendingUpload && emptyCloud && !state.localEmpty
    && canPushLocalSnapshot(account, owner, state.pendingUpload)) {
    return 'push-local';
  }

  if (owner !== account) return 'apply-remote';

  const canPush = canPushLocalSnapshot(account, owner, state.pendingUpload);
  const revMismatch = state.remoteRevision !== state.localRevision;

  // Lagging device with local edits: keep both the server snapshot and the
  // new local task, then upload the union. Never skip the server snapshot.
  if (state.localDirty && canPush && revMismatch) return 'merge-and-push';
  if (state.localDirty && canPush) return 'push-local';
  if (revMismatch) return 'apply-remote';
  return 'idle';
}

function stamp(row: { updatedAt?: string; createdAt?: string }): string {
  return row.updatedAt || row.createdAt || '';
}

export function mergeById<T extends { id: string; updatedAt?: string; createdAt?: string }>(
  remote: T[],
  local: T[],
): T[] {
  const map = new Map<string, T>();
  for (const row of remote) {
    if (row?.id) map.set(row.id, row);
  }
  for (const row of local) {
    if (!row?.id) continue;
    const prev = map.get(row.id);
    if (!prev || stamp(row) >= stamp(prev)) map.set(row.id, row);
  }
  return [...map.values()];
}

export function mergeTaskSnapshots(remote: Task[], local: Task[]): Task[] {
  return mergeById(remote, local);
}
