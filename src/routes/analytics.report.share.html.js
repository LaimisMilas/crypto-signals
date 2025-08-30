import express from 'express';
import fs from 'fs';
import path from 'path';
import { db } from '../storage/db.js';
import { htmlPage } from '../services/reportHtml.js';
import { listArtifacts, readArtifactCSV, normalizeEquity } from '../services/analyticsArtifacts.js';
import { eTagOfJSON, applyCacheHeaders, handleConditionalReq } from '../services/httpCache.js';
import { readSeries as readLiveEquity } from '../services/liveEquity.js';

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

async function loadArtifactsMap(jobIds){
  const map = {};
  for (const id of jobIds){
    const arts = await listArtifacts(id);
    map[id] = arts.map(a => ({
      id: a.id,
      kind: a.kind,
      label: a.label || a.path,
      size_bytes: a.size_bytes || 0,
      download: `/jobs/${id}/artifacts/${a.id}/download`
    }));
  }
  return map;
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
  const artifactsByJobId = await loadArtifactsMap(ids);

  let inline = [];
  if (payload.inline?.optimizeJobId){
    try {
      const arts = await listArtifacts(Number(payload.inline.optimizeJobId));
      const j = arts.find(x => /optimize_topk_equity\.json$/i.test(x.path));
      if (j){
        const raw = JSON.parse(fs.readFileSync(path.resolve(j.path), 'utf8'));
        inline = (raw || []).slice(0, payload.inline.n||3).map(it => ({
          jobId: null,
          label: it.label,
          params: it.params || {},
          equity: it.equity || []
        }));
      }
    } catch (err) { /* ignore */ }
  }
  let baseline = null;
  if (params.baseline === 'live'){
    try {
      const ds = params.ds === 'lttb' ? 'lttb' : undefined;
      const n  = params.n;
      const allTs = items.flatMap(s=>s.equity.map(p=>p.ts)).sort((a,b)=>a-b);
      const from = allTs.length ? allTs[0] : undefined;
      const to = allTs.length ? allTs[allTs.length-1] : undefined;
      const live = await readLiveEquity({ from, to, ds, n });
      baseline = { type:'live', equity: live.items };
    } catch (err) { /* ignore */ }
  }

  const body = { jobIds: ids, items, inline, artifactsByJobId, baseline, params, inlineReq: payload.inline || null };
  const etag = eTagOfJSON({ token: req.params.token, count: items.length, inline: inline?.length||0, p: params });
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
