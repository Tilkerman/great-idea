import type { Pool } from 'pg';
import type { SessionUser } from './auth.js';

type SyncRow = {
  revision: string;
  snapshot: unknown;
  updated_at: Date;
};

export async function readCalendarSync(db: Pool, userId: string) {
  const result = await db.query<SyncRow>(
    `select revision::text, snapshot, updated_at
     from calendar_sync_state
     where user_id = $1`,
    [userId],
  );
  const row = result.rows[0];
  if (!row) {
    return { revision: 0, snapshot: [], updatedAt: null };
  }
  return {
    revision: Number(row.revision),
    snapshot: row.snapshot,
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function writeCalendarSync(
  db: Pool,
  userId: string,
  input: { baseRevision: number; snapshot: unknown },
): Promise<{ ok: true; revision: number } | { ok: false; code: 'revision_conflict'; revision: number; snapshot: unknown }> {
  const current = await readCalendarSync(db, userId);
  if (input.baseRevision !== current.revision) {
    return {
      ok: false,
      code: 'revision_conflict',
      revision: current.revision,
      snapshot: current.snapshot,
    };
  }
  const nextRevision = current.revision + 1;
  await db.query(
    `insert into calendar_sync_state (user_id, revision, snapshot, updated_at)
     values ($1, $2, $3::jsonb, now())
     on conflict (user_id) do update
     set revision = excluded.revision,
         snapshot = excluded.snapshot,
         updated_at = now()`,
    [userId, nextRevision, JSON.stringify(input.snapshot)],
  );
  return { ok: true, revision: nextRevision };
}

export async function readLumiSync(db: Pool, userId: string) {
  const result = await db.query<SyncRow>(
    `select revision::text, snapshot, updated_at
     from lumi_sync_state
     where user_id = $1`,
    [userId],
  );
  const row = result.rows[0];
  if (!row) {
    return { revision: 0, snapshot: {}, updatedAt: null };
  }
  return {
    revision: Number(row.revision),
    snapshot: row.snapshot,
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function writeLumiSync(
  db: Pool,
  userId: string,
  input: { baseRevision: number; snapshot: unknown },
): Promise<{ ok: true; revision: number } | { ok: false; code: 'revision_conflict'; revision: number; snapshot: unknown }> {
  const current = await readLumiSync(db, userId);
  if (input.baseRevision !== current.revision) {
    return {
      ok: false,
      code: 'revision_conflict',
      revision: current.revision,
      snapshot: current.snapshot,
    };
  }
  const nextRevision = current.revision + 1;
  await db.query(
    `insert into lumi_sync_state (user_id, revision, snapshot, updated_at)
     values ($1, $2, $3::jsonb, now())
     on conflict (user_id) do update
     set revision = excluded.revision,
         snapshot = excluded.snapshot,
         updated_at = now()`,
    [userId, nextRevision, JSON.stringify(input.snapshot)],
  );
  return { ok: true, revision: nextRevision };
}

export type { SessionUser };
