import express from 'express';
import { listArtifacts } from '../services/analyticsArtifacts.js';
import { simplify, getCache, setCache } from '../services/overlayPerf.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

router.get('/analytics/optimize/:id/inline-overlays', async (req, res) => {
  const jobId = Number(req.params.id);
  const n = Math.max(1, Math.min(10, Number(req.query.n) || 3));
  const tol = Math.max(0, Number(req.query.tol) || 0);
  const key = `opt_inline:${jobId}:${n}:${tol}`;
  const hit = getCache(key);
  if (hit) return res.json(hit);

  const arts = await listArtifacts(jobId);
  const j = arts.find(x => /optimize_topk_equity\.json$/i.test(x.path));
  if (!j) return res.status(404).json({ error: 'optimize_topk_equity.json not found' });

  const raw = JSON.parse(fs.readFileSync(path.resolve(j.path), 'utf8'));
  const items = (raw || []).slice(0, n).map(it => {
    const eq = Array.isArray(it.equity) ? it.equity : [];
    const data = tol > 0 ? simplify(eq, tol) : eq;
    return { jobId, label: it.label, params: it.params || {}, equity: data };
  });
  const resp = { items };
  setCache(key, resp);
  res.json(resp);
});

export default router;
