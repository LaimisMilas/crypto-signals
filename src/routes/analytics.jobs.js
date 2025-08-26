import express from 'express';
import { db } from '../storage/db.js';
import { listArtifacts, readArtifactCSV, normalizeEquity, normalizeTrades } from '../services/analyticsArtifacts.js';

const router = express.Router();

router.get('/analytics/jobs', async (req, res) => {
  const { type, symbol, strategy } = req.query;
  const limit = Number(req.query.limit) || 50;
  const q = `
    SELECT j.id, j.type, j.status, j.created_at, j.finished_at, j.result, j.params
    FROM jobs j
    WHERE j.status='succeeded'
      AND ($1::text IS NULL OR j.type=$1)
      AND ($2::text IS NULL OR (j.params->>'symbol')=$2)
      AND ($3::text IS NULL OR (j.params->>'strategyId')=$3)
    ORDER BY j.finished_at DESC NULLS LAST, j.id DESC
    LIMIT $4`;
  const { rows } = await db.query(q, [type || null, symbol || null, strategy || null, limit]);
  const jobs = await Promise.all(rows.map(async j => ({ ...j, artifacts: await listArtifacts(j.id) })));
  res.json({ jobs });
});

router.get('/analytics/job/:id/equity', async (req, res) => {
  const jobId = Number(req.params.id);
  const arts = await listArtifacts(jobId);
  const a = arts.find(x => /equity\.csv$|oos_equity\.csv$/i.test(x.path));
  if (!a) return res.status(404).json({ error: 'equity artifact not found' });
  const rows = await readArtifactCSV(jobId, a.path);
  const equity = normalizeEquity(rows);
  res.json({ equity, artifact: a });
});

router.get('/analytics/job/:id/trades', async (req, res) => {
  const jobId = Number(req.params.id);
  const arts = await listArtifacts(jobId);
  const a = arts.find(x => /trades\.csv$/i.test(x.path));
  if (!a) return res.status(404).json({ error: 'trades artifact not found' });
  const rows = await readArtifactCSV(jobId, a.path);
  const trades = normalizeTrades(rows);
  res.json({ trades, artifact: a });
});

export default router;
