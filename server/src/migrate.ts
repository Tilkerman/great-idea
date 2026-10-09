import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readConfig } from './config.js';
import { createPool } from './db.js';

const migrationsDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../migrations',
);

const db = createPool(readConfig());

try {
  await db.query(`
    create table if not exists schema_migrations (
      id text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const applied = new Set(
    (await db.query<{ id: string }>('select id from schema_migrations')).rows.map((row) => row.id),
  );
  const migrationFiles = (await readdir(migrationsDir))
    .filter((name) => name.endsWith('.sql'))
    .sort();

  for (const id of migrationFiles) {
    if (applied.has(id)) continue;
    const sql = await readFile(path.join(migrationsDir, id), 'utf8');
    const client = await db.connect();
    try {
      await client.query('begin');
      await client.query(sql);
      await client.query('insert into schema_migrations (id) values ($1)', [id]);
      await client.query('commit');
      console.log(`Applied ${id}`);
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }
} finally {
  await db.end();
}
