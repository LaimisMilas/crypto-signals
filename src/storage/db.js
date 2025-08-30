import pg from 'pg';
const { Pool } = pg;
import { readFileSync } from 'fs';

const cfg = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
};

const pool = new Pool(cfg);

let ready = false;
let attempt = 0;
const MAX_DELAY_MS = +(process.env.DB_MAX_RETRY_DELAY_MS || 15000);

async function pingOnce() {
  try {
    await pool.query('SELECT 1');
    ready = true;
    attempt = 0;
    console.log('[db] connected');
  } catch (e) {
    attempt += 1;
    const delay = Math.min(1000 * 2 ** Math.min(attempt, 4), MAX_DELAY_MS);
    console.warn('[db] connect failed – retrying', { attempt, delay, code: e.code });
    setTimeout(pingOnce, delay).unref();
  }
}
pingOnce();

export function getDbPool() {
  return pool;
}
export function isDbReady() {
  return ready;
}
export const db = pool;

export async function endPool() {
  try {
    await pool.end();
  } catch {
    // ignore errors during shutdown
  }
}

// Subscribe to PostgreSQL LISTEN/NOTIFY channel
// Returns a function that releases the listener
export async function listen(channel, handler) {
  const client = await pool.connect();
  const onNotify = (msg) => {
    if (msg.channel === channel) handler(msg.payload);
  };
  await client.query(`LISTEN ${channel}`);
  client.on('notification', onNotify);
  return async () => {
    try { await client.query(`UNLISTEN ${channel}`); } catch { /* ignore */ }
    client.removeListener('notification', onNotify);
    client.release();
  };
}

export async function init() {
  const schema = readFileSync(new URL('./schema.pg.sql', import.meta.url), 'utf-8');
  await pool.query(schema);
  console.log('PostgreSQL initialized.');
}

if (process.argv[1].endsWith('db.js')) {
  init().catch(err => {
    console.error('Failed to initialize DB:', err);
    process.exit(1);
  });
}

