import { db } from './storage/db.js';
import { writeJobArtifact } from './services/artifactsFS.js';
import fs from 'fs';
import path from 'path';

const isTest = process.env.NODE_ENV === 'test';
const RUN = process.env.RUN_JOB_WORKER === '1';
let loopTimer = null;
const cancelRequested = new Set();

async function claimNextJob(client) {
  const { rows } = await client.query(`
    UPDATE jobs j
    SET status='running', started_at=now()
    WHERE j.id = (
      SELECT id FROM jobs
      WHERE status='queued'
      ORDER BY priority DESC, created_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING *;
  `);
  return rows[0];
}

async function runBacktest(job, client) {
  const p = job.params || {};
  const symbol = p.symbol || 'BTCUSDT';
  const from = Number(p.from_ms ?? 0);
  const to = Number(p.to_ms ?? Date.now());

  const { rows: candles } = await client.query(
    `SELECT ts, close FROM candles
     WHERE symbol = $1 AND ts BETWEEN $2::bigint AND $3::bigint
     ORDER BY ts ASC`,
    [symbol, from, to]
  );

  let equity = 1000;
  const out = ['ts,equity'];
  for (const c of candles.length ? candles : [{ ts: from, close: 100 }]) {
    equity = Math.max(0, equity * (1 + (((c.close % 3) - 1) * 0.001)));
    out.push(`${c.ts},${equity.toFixed(2)}`);
  }

  const tmp = path.join(process.cwd(), 'tmp');
  fs.mkdirSync(tmp, { recursive: true });
  const localPath = path.join(tmp, `job${job.id}-equity.csv`);
  fs.writeFileSync(localPath, out.join('\n'));

  await writeJobArtifact({
    jobId: job.id,
    kind: 'equity',
    label: 'Equity Curve',
    absPath: localPath,
    filename: 'equity.csv'
  });

  await client.query(`UPDATE jobs SET progress=$1 WHERE id=$2`, [1.0, job.id]);
}

async function processJob(job, client) {
  try {
    if (cancelRequested.has(job.id)) throw new Error('canceled');
    if (job.type === 'backtest') await runBacktest(job, client);
    const status = cancelRequested.has(job.id) ? 'canceled' : 'succeeded';
    await client.query(`UPDATE jobs SET status=$1, finished_at=now() WHERE id=$2`, [status, job.id]);
  } catch (e) {
    if (e.message === 'canceled') {
      await client.query(`UPDATE jobs SET status='canceled', finished_at=now(), error=$1 WHERE id=$2`, [e.message, job.id]);
    } else {
      await client.query(`UPDATE jobs SET status='failed', finished_at=now(), error=$1 WHERE id=$2`, [e.stack || String(e), job.id]);
    }
  }
}

async function tick() {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const job = await claimNextJob(client);
    if (!job) {
      await client.query('COMMIT');
      return;
    }
    await client.query('COMMIT');
    await processJob(job, client);
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
  } finally {
    client.release();
  }
}

export function start() {
  if (isTest || !RUN) return;
  if (loopTimer) return;
  loopTimer = setInterval(tick, 2000);
}

export function stop() {
  if (loopTimer) {
    clearInterval(loopTimer);
    loopTimer = null;
  }
}

export function requestCancel(id) {
  cancelRequested.add(Number(id));
}

export default { start, stop, requestCancel };
