import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../../data.sqlite');

if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, '');

export const db = new sqlite3.Database(dbPath);

export function init() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  db.exec(schema);
  console.log('SQLite initialized.');
}

if (process.argv[1].endsWith('db.js')) init();
