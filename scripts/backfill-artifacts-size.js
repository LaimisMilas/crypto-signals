#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { db } from '../src/storage/db.js';
import { ARTIFACTS_ROOT } from '../src/config.js';

(async function () {
  const { rows } = await db.query('SELECT id, job_id, path, size_bytes FROM job_artifacts ORDER BY id');
  let upd = 0, miss = 0;
  for (const r of rows) {
    try {
      const abs = path.resolve(ARTIFACTS_ROOT, (r.path || '').replace(/^[/\\]+/, ''));
      const st = fs.statSync(abs);
      if (!r.size_bytes || r.size_bytes !== st.size) {
        await db.query('UPDATE job_artifacts SET size_bytes=$1 WHERE id=$2', [st.size, r.id]);
        upd++;
      }
    } catch {
      miss++;
    }
  }
  console.log(`Updated: ${upd}, missing: ${miss}`);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });

