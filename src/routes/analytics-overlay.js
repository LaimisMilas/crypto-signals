import express from 'express';
import { listArtifacts, readArtifactCSV, normalizeEquity, normalizeTrades } from '../services/analyticsArtifacts.js';
import { sseBroadcast, getActiveTraceMeta } from './sse.js';
import { db } from '../storage/db.js';

const router = express.Router();

function parseStrategies(q) {
  const raw = q.strategy ?? q.strategies;
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : String(raw).split(',');
  return arr.map(s => s.trim()).filter(Boolean);
}

router.get('/analytics/overlay/:id', async (req, res) => {
  const jobId = Number(req.params.id);
  const strategies = parseStrategies(req.query);
  const { rows: jrows } = await db.query('SELECT type FROM jobs WHERE id=$1', [jobId]);
  const jobType = jrows[0]?.type;

  const arts = await listArtifacts(jobId);
  const eqArt = arts.find(x => /equity\.csv$|oos_equity\.csv$/i.test(x.path));
  const trArt = arts.find(x => /trades\.csv$/i.test(x.path));

  let equity = [];
  if (eqArt) {
    let rows = await readArtifactCSV(jobId, eqArt.path);
    if (strategies.length) rows = rows.filter(r => strategies.includes(String(r.strategy || '').trim()));
    equity = normalizeEquity(rows, jobType);
  }

  let trades = [];
  if (trArt) {
    let rows = await readArtifactCSV(jobId, trArt.path);
    if (strategies.length) rows = rows.filter(r => strategies.includes(String(r.strategy || '').trim()));
    trades = normalizeTrades(rows);
  }

  const meta = { ...getActiveTraceMeta(), jobId, jobType };
  sseBroadcast('overlay', { equity, trades }, meta);
  res.json({ ok: true });
});

export default router;
