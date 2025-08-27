import express from 'express';
import { listArtifacts, readArtifactCSV, normalizeEquity } from '../services/analyticsArtifacts.js';
import { htmlPage } from '../services/reportHtml.js';
import { eTagOfJSON, applyCacheHeaders, handleConditionalReq } from '../services/httpCache.js';

async function loadSeries(jobIds){
  const out = [];
  for (const id of jobIds){
    const arts = await listArtifacts(id);
    const a = arts.find(x => /equity\.csv$|oos_equity\.csv$/i.test(x.path));
    if (!a) continue;
    const rows = await readArtifactCSV(id, a.path);
    const eq = normalizeEquity(rows);
    if (eq.length) out.push({ jobId: id, label: '#'+id, equity: eq });
  }
  return out;
}

const router = express.Router();

router.get('/analytics/overlays/report.html', async (req, res) => {
  const ids = String(req.query.job_ids||'').split(',').map(s=>Number(s.trim())).filter(Boolean).slice(0,12);
  if (!ids.length) return res.status(400).send('job_ids required');
  const params = {
    baseline: req.query.baseline==='live' ? 'live' : 'none',
    align: req.query.overlay_align==='first-common' ? 'first-common' : 'none',
    rebase: (req.query.overlay_rebase==='' || req.query.overlay_rebase==null) ? null : Number(req.query.overlay_rebase),
    ds: req.query.ds || 'none',
    n: req.query.n ? Number(req.query.n) : undefined
  };

  const items = await loadSeries(ids);
  const baseline = null;
  const payload = { jobIds: ids, items, baseline, params };
  const etag = eTagOfJSON({ ids, count: items.length, p: params });
  const now = Date.now();
  if (handleConditionalReq(req, res, etag, now)) {
    applyCacheHeaders(res, { etag, lastModified: now, maxAge: 300 });
    return res.status(304).end();
  }

  const html = htmlPage({
    title: `Analytics Report – ${ids.map(id=>'#'+id).join(', ')}`,
    dataJson: JSON.stringify(payload),
    generatedAt: now,
    params
  });
  applyCacheHeaders(res, { etag, lastModified: now, maxAge: 300 });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

export default router;
