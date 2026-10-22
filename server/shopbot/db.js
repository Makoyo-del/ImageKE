import pg from 'pg';
import { cfg } from './config.js';

export const pool = new pg.Pool({
  connectionString: cfg.databaseUrl,
  max: 8,
  idleTimeoutMillis: 30_000,
  application_name: 'shopbot-app',
  ssl: cfg.databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false },
});
pool.on('error', (e) => console.error('[pg pool]', e.message));

/** Run fn inside a transaction. Rolls back on throw. */
export async function withTx(fn) {
  const c = await pool.connect();
  try {
    await c.query('begin');
    const out = await fn(c);
    await c.query('commit');
    return out;
  } catch (e) {
    await c.query('rollback').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

/** Transaction that also serialises all work for one WhatsApp user (ordered, race-free). */
export function withUserTx(waId, fn) {
  return withTx(async (c) => {
    await c.query('select pg_advisory_xact_lock(hashtextextended($1, 0))', [`shopbot:${waId}`]);
    return fn(c);
  });
}
