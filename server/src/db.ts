import { Pool } from 'pg';
import type { AppConfig } from './config.js';

export function createPool(config: AppConfig) {
  return new Pool({
    connectionString: config.DATABASE_URL,
    ssl: config.NODE_ENV === 'production' ? { rejectUnauthorized: true } : undefined,
    max: 10,
    idleTimeoutMillis: 30_000,
  });
}
