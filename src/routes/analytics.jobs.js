import express from 'express';
import { db } from '../storage/db.js';
import { listArtifacts, fetchEquity, fetchTrades } from '../services/analyticsArtifacts.js';

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
  const jobs = await Promise.all(rows.map(async j => {
    const arts = await listArtifacts(j.id);
    return { ...j, artifacts: arts };
  }));
  res.json({ jobs });
});

router.get('/analytics/job/:id/equity', async (req, res) => {
  try {
    const { equity, artifact } = await fetchEquity(req.params.id);
    res.json({ equity, artifact });
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

router.get('/analytics/job/:id/trades', async (req, res) => {
  try {
    const { trades, artifact } = await fetchTrades(req.params.id);
    res.json({ trades, artifact });
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

export default router;
