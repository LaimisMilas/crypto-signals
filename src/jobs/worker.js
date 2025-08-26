import { db } from '../storage/db.js';
import { log, setProgress, markStatus, checkCanceled } from './progress.js';
import * as fsh from './fs.js';
import { run as runBacktest } from './runners/backtest.js';
import { run as runOptimize } from './runners/optimize.js';
import { run as runWalkforward } from './runners/walkforward.js';
import { observeQueue } from './metrics.js';

const RUNNERS = {
  backtest: runBacktest,
  optimize: runOptimize,
  walkforward: runWalkforward,
};

observeQueue(async () => {
  const { rows } = await db.query(`
    SELECT COUNT(*) AS size,
           EXTRACT(EPOCH FROM now() - min(queued_at)) * 1000 AS oldest_age_ms
    FROM jobs
    WHERE status='queued'
  `);
  const size = Number(rows[0]?.size || 0);
  const oldestAgeMs = Number(rows[0]?.oldest_age_ms || 0);
  return { size, oldestAgeMs };
});

async function claimNextJob(client) {
  const { rows } = await client.query(`
    UPDATE jobs
    SET status='running', started_at=now()
    WHERE id = (
      SELECT id FROM jobs
      WHERE status='queued'
      ORDER BY priority ASC, id ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING *`);
  return rows[0];
}

async function runJob(job) {
  const runner = RUNNERS[job.type];
  if (!runner) {
    await markStatus(job.id, 'failed', { error: `unknown job type: ${job.type}` });
    return;
  }
  const controller = new AbortController();
  const cancelCheck = setInterval(async () => {
    if (await checkCanceled(job.id)) controller.abort();
  }, 1000);
  try {
    await log(job.id, 'info', `job ${job.id} started`);
    const result = await runner(job, {
      db,
      fs: fsh,
      log: (level, msg) => log(job.id, level, msg),
      progress: (p) => setProgress(job.id, p),
      signal: controller.signal,
    });
    await markStatus(job.id, 'succeeded', { result });
  } catch (e) {
    if (controller.signal.aborted) {
      await markStatus(job.id, 'canceled');
    } else {
      await markStatus(job.id, 'failed', { error: e.message });
    }
  } finally {
    clearInterval(cancelCheck);
  }
}

export function startWorker() {
  const interval = Number(process.env.JOB_WORKER_INTERVAL_MS || 2000);
  const loop = async () => {
    const client = await db.connect();
    try {
      const job = await claimNextJob(client);
      if (job) {
        await runJob(job);
      }
    } catch (e) {
      console.error('worker loop error', e);
    } finally {
      client.release();
      setTimeout(loop, interval);
    }
  };
  loop();
}
