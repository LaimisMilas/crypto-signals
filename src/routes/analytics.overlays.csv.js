import express from 'express';
import { listArtifacts, readArtifactCSV, normalizeEquity } from '../services/analyticsArtifacts.js';
import { db } from '../storage/db.js';

const router = express.Router();

router.get('/analytics/overlays.csv', async (req, res) => {
  const ids = (req.query.job_ids || '')
    .split(',')
    .map(s => Number(s.trim()))
    .filter(Boolean)
    .slice(0, 5);
  if (!ids.length) {
    res.status(400).send('job_ids required');
    return;
  }

  const series = [];
  const tsSet = new Set();
  for (const id of ids) {
    const arts = await listArtifacts(id);
    const a = arts.find(x => /equity\.csv$|oos_equity\.csv$/i.test(x.path));
    if (!a) continue;
    const rows = await readArtifactCSV(id, a.path);
    const { rows: jrows } = await db.query('SELECT type FROM jobs WHERE id=$1', [id]);
    const eq = normalizeEquity(rows, jrows[0]?.type);
    series.push({ id, data: eq });
    eq.forEach(p => tsSet.add(String(p.ts)));
  }

  const header = ['ts', ...series.map(s => `job_${s.id}`)];
  const lines = [header.join(',')];
  const allTs = Array.from(tsSet).map(s => Number(s)).sort((a, b) => a - b);

  const maps = series.map(s => {
    const m = new Map();
    s.data.forEach(p => m.set(p.ts, p.equity));
    return { id: s.id, map: m };
  });

  for (const ts of allTs) {
    const row = [ts, ...maps.map(m => m.map.get(ts) ?? '')];
    lines.push(row.join(','));
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.send(lines.join('\n'));
});

export default router;
