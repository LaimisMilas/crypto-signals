import express from 'express';
import { writeSnapshot, readSeries } from '../services/liveEquity.js';
import { eTagOfJSON, applyCacheHeaders, handleConditionalReq } from '../services/httpCache.js';
import logger from '../observability/logger.js';

const router = express.Router();

router.get('/live/equity', async (req, res) => {
  const { from, to, limit, ds, n, source } = req.query || {};
  const data = await readSeries({ from, to, limit, ds, n, source });
  const etag = eTagOfJSON({ len: data.items.length, from, to, ds, n, source: source || 'live' });
  if (handleConditionalReq(req, res, etag, data.asOf)) {
    applyCacheHeaders(res, { etag, lastModified: data.asOf, maxAge: 60 });
    return res.status(304).end();
  }
  applyCacheHeaders(res, { etag, lastModified: data.asOf, maxAge: 60 });
  res.json(data);
});

router.post('/live/equity/snapshot', express.json(), async (req, res) => {
  try {
    const out = await writeSnapshot(req.body || {});
    logger.info({ ts: out.ts, equity: out.equity, source: out.source }, 'live_equity_snapshot');
    res.status(201).json(out);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
