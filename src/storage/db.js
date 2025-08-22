import pkg from 'pg';
const { Pool } = pkg;
import { readFileSync } from 'fs';
import { cfg } from '../config.js';

const connectionString = cfg.dbUrl;
if (!connectionString) {
  throw new Error('Missing DATABASE_URL environment variable');
}

export const db = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

// Subscribe to PostgreSQL LISTEN/NOTIFY channel
// Returns a function that releases the listener
export async function listen(channel, handler) {
  const client = await db.connect();
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
  await db.query(schema);
  console.log('PostgreSQL initialized.');
}

if (process.argv[1].endsWith('db.js')) {
  init().catch(err => {
    console.error('Failed to initialize DB:', err);
    process.exit(1);
  });
}
