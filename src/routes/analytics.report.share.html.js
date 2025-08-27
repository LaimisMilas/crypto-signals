import express from 'express';
import { db } from '../storage/db.js';
import { htmlPage } from '../services/reportHtml.js';
import { listArtifacts, readArtifactCSV, normalizeEquity } from '../services/analyticsArtifacts.js';
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

router.get('/analytics/overlays/share/:token/report.html', async (req,res)=>{
  let payload = null;
  const { rows } = await db.query(`SELECT payload FROM overlay_shares WHERE token=$1`, [req.params.token]);
  if (rows.length) payload = rows[0].payload || {};
  if (!payload){
    const r2 = await db.query(`SELECT payload FROM overlay_sets WHERE token=$1`, [req.params.token]);
    if (r2.rows.length) payload = r2.rows[0].payload || {};
  }
  if (!payload) return res.status(404).send('share token not found');
  const ids = (payload.jobIds||[]).slice(0,12);
  const params = {
    baseline: payload.baseline || 'none',
    align: payload.align || 'none',
    rebase: payload.rebase ?? null,
    ds: 'none', n: undefined
  };
  const items = await loadSeries(ids);
  const body = { jobIds: ids, items, baseline: null, params };
  const etag = eTagOfJSON({ token: req.params.token, count: items.length, p: params });
  const now = Date.now();
  if (handleConditionalReq(req, res, etag, now)) {
    applyCacheHeaders(res, { etag, lastModified: now, maxAge: 600 });
    return res.status(304).end();
  }
  const html = htmlPage({
    title: `Analytics Report – share:${req.params.token}`,
    dataJson: JSON.stringify(body),
    generatedAt: now,
    params
  });
  applyCacheHeaders(res, { etag, lastModified: now, maxAge: 600 });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

export default router;
