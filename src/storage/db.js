import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {cfg} from "../config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Prisijungimo duomenys iš aplinkos kintamųjų
// Pvz.: postgresql://user:pass@host:port/dbname
const connectionString = cfg.dbUrl;

if (!connectionString) {
  throw new Error('Missing DATABASE_URL environment variable');
}

// Sukuriam jungčių baseiną
export const db = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }, // Neon reikalauja SSL
});

export async function init() {
  const schemaPath = path.join(__dirname, 'pg.schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  await db.query(schema);
  console.log('PostgreSQL initialized.');
}

if (process.argv[1].endsWith('db.js')) {
  init().catch(err => {
    console.error('Failed to initialize DB:', err);
    process.exit(1);
  });
}
