import express from 'express';
import path from 'path';
import { db, listen } from '../storage/db.js';

const router = express.Router();

router.post('/jobs', async (req, res) => {
  const { type, params, priority } = req.body || {};
  if (!type || !params) return res.status(400).json({ error: 'invalid' });
  const { rows } = await db.query(
    'INSERT INTO jobs(type, params, priority) VALUES ($1,$2,$3) RETURNING *',
    [type, JSON.stringify(params), priority || 100]
  );
  res.json(rows[0]);
});

router.get('/jobs', async (req, res) => {
  const { type, status } = req.query;
  const limit = Number(req.query.limit) || 50;
  const offset = Number(req.query.offset) || 0;
  const { rows } = await db.query(
    `SELECT * FROM jobs
     WHERE ($1::text IS NULL OR type=$1)
       AND ($2::text IS NULL OR status=$2)
     ORDER BY id DESC
     LIMIT $3 OFFSET $4`,
    [type || null, status || null, limit, offset]
  );
  res.json(rows);
});

router.get('/jobs/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { rows: jobs } = await db.query('SELECT * FROM jobs WHERE id=$1', [id]);
  if (!jobs.length) return res.status(404).json({ error: 'not_found' });
  const job = jobs[0];
  const { rows: artifacts } = await db.query('SELECT * FROM job_artifacts WHERE job_id=$1 ORDER BY id ASC', [id]);
  const { rows: logs } = await db.query('SELECT * FROM job_logs WHERE job_id=$1 ORDER BY id DESC LIMIT 100', [id]);
  res.json({ job, artifacts, logs });
});

router.post('/jobs/:id/cancel', async (req, res) => {
  const id = Number(req.params.id);
  await db.query(
    `UPDATE jobs SET status='canceled' WHERE id=$1 AND status IN ('queued','running')`,
    [id]
  );
  res.json({ ok: true });
});

router.get('/jobs/:id/logs', async (req, res) => {
  const id = Number(req.params.id);
  const since = Number(req.query.since) || 0;
  const { rows } = await db.query(
    `SELECT * FROM job_logs WHERE job_id=$1 AND id > $2 ORDER BY id ASC LIMIT 100`,
    [id, since]
  );
  res.json(rows);
});

router.get('/jobs/:id/artifacts/:aid/download', async (req, res) => {
  const id = Number(req.params.id);
  const aid = Number(req.params.aid);
  const { rows } = await db.query(
    'SELECT path FROM job_artifacts WHERE job_id=$1 AND id=$2',
    [id, aid]
  );
  if (!rows.length) return res.status(404).end();
  const p = rows[0].path;
  res.download(p, path.basename(p));
});

router.get('/jobs/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  if (req.trace?.trace_id) res.write(`: trace_id=${req.trace.trace_id}\n`);
  if (req.trace?.req_id) res.write(`: req_id=${req.trace.req_id}\n`);
  res.write('\n');
  res.flushHeaders?.();
  const filterId = req.query.id ? Number(req.query.id) : null;

    const sendEvent = (type, payload) => {
      const meta = { trace_id: req.trace?.trace_id || null, req_id: req.trace?.req_id || null };
      res.write(`event: ${type}\n`);
      res.write(`data: ${JSON.stringify({ ...payload, meta })}\n\n`);
    };
    const sendUpdate = async (jobId) => {
      const { rows: jobRows } = await db.query(
        'SELECT id, status, progress FROM jobs WHERE id=$1',
        [jobId]
      );
      if (jobRows[0]) {
        sendEvent('job', jobRows[0]);
      }
      const { rows: logRows } = await db.query(
        'SELECT id, level, msg, ts FROM job_logs WHERE job_id=$1 ORDER BY id DESC LIMIT 1',
        [jobId]
      );
      if (logRows[0]) {
        sendEvent('log', logRows[0]);
      }
    };

  const release = await listen('job_update', async (payload) => {
    const jobId = Number(payload);
    if (filterId && jobId !== filterId) return;
    await sendUpdate(jobId);
  });

  if (filterId) await sendUpdate(filterId);

  req.on('close', () => {
    release();
  });
});

export function jobsRoutes(app) {
  app.use(router);
}

export default { jobsRoutes };
