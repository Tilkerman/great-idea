export type CloudBootstrapAction = 'apply-remote' | 'push-local' | 'idle';

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
  if (state.remoteRevision !== state.localRevision) return 'apply-remote';
  if (state.localDirty) return 'push-local';
  return 'idle';
}
