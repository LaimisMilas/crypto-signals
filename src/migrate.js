import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './storage/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  const dir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  for (const f of files) {
    const sql = fs.readFileSync(path.join(dir, f), 'utf8');
    console.log('Running migration:', f);
    await db.query(sql);
  }
  console.log('Migrations: done');
  process.exit(0);
})().catch(e => {
  console.error(e);
  process.exit(1);
});
