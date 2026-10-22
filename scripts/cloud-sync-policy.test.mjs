import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canPushLocalSnapshot,
  decideCloudBootstrap,
} from '../src/utils/cloudSyncPolicy.ts';

const base = {
  accountEmail: 'a@example.com',
  localOwnerEmail: 'a@example.com',
  pendingUpload: false,
  localDirty: false,
  localEmpty: false,
  localRevision: 3,
  remoteRevision: 3,
};

test('migrates non-empty guest data only after explicit registration', () => {
  assert.equal(decideCloudBootstrap({
    ...base,
    localOwnerEmail: '',
    pendingUpload: true,
    localRevision: 0,
    remoteRevision: 0,
  }), 'push-local');
});

test('does not migrate data owned by account A into newly registered account B', () => {
  assert.equal(decideCloudBootstrap({
    ...base,
    accountEmail: 'b@example.com',
    localOwnerEmail: 'a@example.com',
    pendingUpload: true,
    localRevision: 0,
    remoteRevision: 0,
  }), 'apply-remote');
});

test('forces remote snapshot on A to B account switch even at equal revisions', () => {
  assert.equal(decideCloudBootstrap({
    ...base,
    accountEmail: 'b@example.com',
    localOwnerEmail: 'a@example.com',
  }), 'apply-remote');
});

test('forces remote snapshot when returning from B to A', () => {
  assert.equal(decideCloudBootstrap({
    ...base,
    accountEmail: 'a@example.com',
    localOwnerEmail: 'b@example.com',
  }), 'apply-remote');
});

test('treats legacy unowned browser data as unsafe for an existing account', () => {
  assert.equal(decideCloudBootstrap({
    ...base,
    localOwnerEmail: '',
  }), 'apply-remote');
});

test('pulls server state whenever revisions differ', () => {
  assert.equal(decideCloudBootstrap({
    ...base,
    remoteRevision: 4,
  }), 'apply-remote');
});

test('pushes a persisted local edit only for the owning account', () => {
  assert.equal(decideCloudBootstrap({
    ...base,
    localDirty: true,
  }), 'push-local');
});

test('does nothing when owner and revisions match and data is clean', () => {
  assert.equal(decideCloudBootstrap(base), 'idle');
});

test('does not push leftover local data when the new account cloud is empty', () => {
  assert.equal(decideCloudBootstrap({
    ...base,
    accountEmail: 'b@example.com',
    localOwnerEmail: 'a@example.com',
    pendingUpload: false,
    localRevision: 0,
    remoteRevision: 0,
  }), 'apply-remote');
});

test('does not migrate guest leftover into a cloud that already has data', () => {
  assert.equal(decideCloudBootstrap({
    ...base,
    localOwnerEmail: '',
    pendingUpload: true,
    localRevision: 0,
    remoteRevision: 4,
  }), 'apply-remote');
});

test('periodic pull with equal revisions still replaces data after account switch', () => {
  assert.equal(decideCloudBootstrap({
    ...base,
    accountEmail: 'tilkerman@example.com',
    localOwnerEmail: 'other@example.com',
    localRevision: 0,
    remoteRevision: 0,
  }), 'apply-remote');
});

test('does not create a cloud revision for an empty guest migration', () => {
  assert.equal(decideCloudBootstrap({
    ...base,
    localOwnerEmail: '',
    pendingUpload: true,
    localEmpty: true,
    localRevision: 0,
    remoteRevision: 0,
  }), 'apply-remote');
});

test('server wins when local dirty data also has a stale revision', () => {
  assert.equal(decideCloudBootstrap({
    ...base,
    localDirty: true,
    remoteRevision: 4,
  }), 'apply-remote');
});

test('runtime push guard rejects a snapshot owned by another account', () => {
  assert.equal(canPushLocalSnapshot('b@example.com', 'a@example.com', false), false);
  assert.equal(canPushLocalSnapshot('b@example.com', 'a@example.com', true), false);
});

test('runtime push guard permits owner edits and explicit guest migration', () => {
  assert.equal(canPushLocalSnapshot('a@example.com', 'A@example.com', false), true);
  assert.equal(canPushLocalSnapshot('a@example.com', '', true), true);
  assert.equal(canPushLocalSnapshot('a@example.com', '', false), false);
});
