import express from 'express';
import fs from 'fs';
import path from 'path';
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

function parseInlineParams(q){
  const optimizeId = Number(q.inline_optimize_id || 0) || null;
  const n = Math.max(1, Math.min(10, Number(q.inline_n) || 0));
  const tol = Math.max(0, Number(q.inline_tol) || 0);
  return optimizeId ? { optimizeJobId: optimizeId, n, tol } : null;
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
  const inlineReq = parseInlineParams(req.query);

  const items = await loadSeries(ids);
  const artifactsByJobId = await loadArtifactsMap(ids);

  let inline = [];
  if (inlineReq){
    try {
      const arts = await listArtifacts(inlineReq.optimizeJobId);
      const j = arts.find(x => /optimize_topk_equity\.json$/i.test(x.path));
      if (j){
        const raw = JSON.parse(fs.readFileSync(path.resolve(j.path), 'utf8'));
        inline = (raw || []).slice(0, inlineReq.n).map(it => ({
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
        baseline = null; // TODO: integrate live baseline helper
      } catch (err) { /* ignore */ }
  }

  const payload = { jobIds: ids, items, inline, artifactsByJobId, baseline, params, inlineReq };
  const etag = eTagOfJSON({ ids, count: items.length, inline: inline?.length||0, p: params });
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
