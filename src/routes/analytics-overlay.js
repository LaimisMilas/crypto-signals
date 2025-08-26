import express from 'express';
import { listArtifacts, readArtifactCSV, normalizeEquity, normalizeTrades } from '../services/analyticsArtifacts.js';
import { sseBroadcast, getActiveTraceMeta } from './sse.js';
import { db } from '../storage/db.js';

const router = express.Router();

router.get('/analytics/overlay/:id', async (req, res) => {
  const jobId = Number(req.params.id);
  const { rows: jrows } = await db.query('SELECT type FROM jobs WHERE id=$1', [jobId]);
  const jobType = jrows[0]?.type;

  const arts = await listArtifacts(jobId);
  const eqArt = arts.find(x => /equity\.csv$|oos_equity\.csv$/i.test(x.path));
  const trArt = arts.find(x => /trades\.csv$/i.test(x.path));

  let equity = [];
  if (eqArt) {
    const rows = await readArtifactCSV(jobId, eqArt.path);
    equity = normalizeEquity(rows, jobType);
  }

  let trades = [];
  if (trArt) {
    const rows = await readArtifactCSV(jobId, trArt.path);
    trades = normalizeTrades(rows);
  }

  const meta = { ...getActiveTraceMeta(), jobId, jobType };
  sseBroadcast('overlay', { equity, trades }, meta);
  res.json({ ok: true });
});

export default router;
