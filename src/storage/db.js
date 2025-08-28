import pkg from 'pg';
const { Pool } = pkg;
import { readFileSync } from 'fs';

const conn = process.env.DATABASE_URL;

export const db = conn
  ? new Pool({
      connectionString: conn,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      host: process.env.PGHOST,
      port: +(process.env.PGPORT || 5432),
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
      ssl: { rejectUnauthorized: false },
    });

if (!conn && !process.env.PGHOST) {
  throw new Error('Missing DATABASE_URL or PG* environment variables');
}

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
