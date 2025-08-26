import express from 'express';
import { listArtifacts, readArtifactCSV } from '../services/analyticsArtifacts.js';

const router = express.Router();

router.get('/analytics/optimize/:id/top', async (req, res) => {
  const jobId = Number(req.params.id);
  const n = Math.max(1, Math.min(10, Number(req.query.n) || 3));
  const arts = await listArtifacts(jobId);
  const a = arts.find(x => /optimize_results\.csv$/i.test(x.path));
  if (!a) return res.status(404).json({ error: 'optimize_results.csv not found' });
  const rows = await readArtifactCSV(jobId, a.path);
  const sorted = rows
    .map(r => ({ raw: r, score: Number(r.cagr ?? r.return ?? r.pf ?? 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map(x => x.raw);
  res.json({ top: sorted });
});

export default router;
