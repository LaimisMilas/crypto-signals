import express from 'express';
import archiver from 'archiver';
import { listArtifacts, readArtifactCSV, normalizeEquity } from '../services/analyticsArtifacts.js';
import { summarizeSeries, withBaselineDelta } from '../services/overlayStats.js';

const router = express.Router();

async function loadOverlaySeries(jobIds){
  const items = [];
  for (const id of jobIds){
    const arts = await listArtifacts(id);
    const a = arts.find(x => /equity\.csv$|oos_equity\.csv$/i.test(x.path));
    if (!a) continue;
    const rows = await readArtifactCSV(id, a.path);
    const equity = normalizeEquity(rows);
    if (!equity.length) continue;
    items.push({ jobId: id, label: `#${id}`, equity });
  }
  return items;
}

router.get('/analytics/overlays/report', async (req, res) => {
  const ids = String(req.query.job_ids || '')
    .split(',')
    .map(s => Number(s.trim()))
    .filter(Boolean)
    .slice(0, 12);
  const baseline = req.query.baseline === 'live' ? 'live' : 'none';
  const align = req.query.overlay_align === 'first-common' ? 'first-common' : 'none';
  const rebase = req.query.overlay_rebase ? Number(req.query.overlay_rebase) : null;

  if (!ids.length) return res.status(400).json({ error: 'job_ids required' });

  const series = await loadOverlaySeries(ids);

  let baselineObj = null;
  if (baseline === 'live'){
    try {
      baselineObj = null;
    } catch {}
  }

  const summaries = withBaselineDelta(summarizeSeries(series), baselineObj);

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="analytics-report.zip"');

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', err => { try{ res.status(500).end(); }catch{} });
  archive.pipe(res);

  const settings = { jobIds: ids, baseline, align, rebase, generated_at_ms: Date.now() };
  archive.append(JSON.stringify(settings, null, 2), { name: 'settings.json' });

  archive.append(JSON.stringify({ summaries }, null, 2), { name: 'stats.json' });

  const md = [
    '# Analytics Report',
    '',
    `**Jobs**: ${ids.map(id=>`#${id}`).join(', ')}`,
    `**Baseline**: ${baseline}`,
    `**Align**: ${align}  |  **Rebase**: ${rebase ?? '-'}`,
    '',
    '## Stats',
    '| Series | Return | MaxDD | ΔReturn vs Baseline | ΔMaxDD vs Baseline |',
    '|---|---:|---:|---:|---:|',
    ...summaries.map(s=>`| ${s.label} | ${pct(s.return)} | ${pct(s.maxDD)} | ${pp(s.deltaReturn)} | ${pp(s.deltaMaxDD)} |`)
  ].join('\n');
  function pct(v){ return v==null ? '-' : (v*100).toFixed(2)+'%'; }
  function pp(v){ return v==null ? '-' : (v*100).toFixed(2)+'pp'; }
  archive.append(md, { name: 'README.md' });

  const tsSet = new Set();
  series.forEach(s => s.equity.forEach(p=> tsSet.add(p.ts)));
  const allTs = Array.from(tsSet).sort((a,b)=>a-b);
  const header = ['ts', ...series.map(s=>`job_${s.jobId}`)];
  const lines = [header.join(',')];
  const maps = series.map(s=> {
    const m = new Map();
    s.equity.forEach(p=> m.set(p.ts, p.equity));
    return m;
  });
  for (const ts of allTs){
    lines.push([ts, ...maps.map(m=> m.get(ts) ?? '')].join(','));
  }
  archive.append(lines.join('\n'), { name: 'overlays.csv' });

  archive.finalize();
});

router.post('/analytics/overlays/report', express.json({limit:'7mb'}), async (req, res)=>{
  const { jobIds = [], baseline = 'none', align = 'none', rebase = null, image } = req.body || {};
  if (!Array.isArray(jobIds) || !jobIds.length) return res.status(400).json({ error: 'jobIds required' });

  const series = await loadOverlaySeries(jobIds);
  const summaries = withBaselineDelta(summarizeSeries(series), null);

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="analytics-report.zip"');

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', err => { try{ res.status(500).end(); }catch{} });
  archive.pipe(res);

  const settings = { jobIds, baseline, align, rebase, generated_at_ms: Date.now() };
  archive.append(JSON.stringify(settings, null, 2), { name: 'settings.json' });
  archive.append(JSON.stringify({ summaries }, null, 2), { name: 'stats.json' });

  const md = [
    '# Analytics Report','',`**Jobs**: ${jobIds.map(id=>`#${id}`).join(', ')}`,
    `**Baseline**: ${baseline}`, `**Align**: ${align}  |  **Rebase**: ${rebase ?? '-'}`, ''
  ].join('\n');
  archive.append(md, { name: 'README.md' });

  const tsSet = new Set();
  series.forEach(s => s.equity.forEach(p=> tsSet.add(p.ts)));
  const allTs = Array.from(tsSet).sort((a,b)=>a-b);
  const header = ['ts', ...series.map(s=>`job_${s.jobId}`)];
  const lines = [header.join(',')];
  const maps = series.map(s=> { const m=new Map(); s.equity.forEach(p=>m.set(p.ts,p.equity)); return m; });
  for (const ts of allTs) lines.push([ts, ...maps.map(m=> m.get(ts) ?? '')].join(','));
  archive.append(lines.join('\n'), { name: 'overlays.csv' });

  if (typeof image === 'string' && image.startsWith('data:image/png;base64,')) {
    const b64 = image.split(',')[1];
    archive.append(Buffer.from(b64, 'base64'), { name: 'chart.png' });
  }

  archive.finalize();
});

export default router;
