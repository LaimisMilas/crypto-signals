import express from 'express';
import { db, listen } from '../storage/db.js';
import { sseConnections, sseEventsSent } from '../observability/metrics.js';

const router = express.Router();
const STARTING_EQUITY = 10000;

function parseDate(v) {
  if (!v) return null;
  const t = Date.parse(String(v));
  return Number.isNaN(t) ? null : t;
}

function parseParams(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    const obj = {};
    for (const part of String(raw).split(/[;,]/)) {
      const [k, v] = part.split('=').map(s => s.trim());
      if (k && v) obj[k] = isNaN(v) ? v : Number(v);
    }
    return Object.keys(obj).length ? obj : null;
  }
}

function parseFilters(q) {
  return {
    symbol: (q.symbol || '').toString().trim() || null,
    strategy: (q.strategy || '').toString().trim() || null,
    params: parseParams(q.params),
    from: parseDate(q.from),
    to: parseDate(q.to),
  };
}

async function startingEquity() {
  try {
    const { rows } = await db.query('SELECT balance_start FROM paper_state WHERE id=1');
    return rows.length ? Number(rows[0].balance_start) : STARTING_EQUITY;
  } catch {
    return STARTING_EQUITY;
  }
}

async function tableExists(name) {
  const { rows } = await db.query('SELECT to_regclass($1) AS t', [name]);
  return !!rows[0].t;
}

async function loadEquitySeries(filters, limit = 1000) {
  const base = await startingEquity();
  if (await tableExists('equity_history')) {
    const { symbol, strategy, params, from, to } = filters;
    const cond = [];
    const vals = [];
    let i = 1;
    if (symbol) { cond.push(`symbol=$${i++}`); vals.push(symbol); }
    if (strategy) { cond.push(`strategy=$${i++}`); vals.push(strategy); }
    if (params) { cond.push(`params @> $${i++}`); vals.push(JSON.stringify(params)); }
    if (from) { cond.push(`ts >= to_timestamp($${i++}/1000.0)`); vals.push(from); }
    if (to) { cond.push(`ts <= to_timestamp($${i++}/1000.0)`); vals.push(to); }
    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
    const q = `SELECT EXTRACT(EPOCH FROM ts)*1000 AS ts, equity FROM equity_history ${where} ORDER BY ts ASC LIMIT ${limit}`;
    const { rows } = await db.query(q, vals);
    const points = rows.map(r => ({ ts: Number(r.ts), equity: Number(r.equity) }));
    const last = points[points.length - 1];
    return { points, lastTs: last ? last.ts : null, lastEq: last ? last.equity : base };
  } else {
    const { symbol, strategy, params, from, to } = filters;
    const cond = ["status='CLOSED'"];
    const vals = [];
    let i = 1;
    if (symbol) { cond.push(`symbol=$${i++}`); vals.push(symbol); }
    if (strategy) { cond.push(`strategy=$${i++}`); vals.push(strategy); }
    if (params) { cond.push(`params @> $${i++}`); vals.push(JSON.stringify(params)); }
    if (from) { cond.push(`closed_at >= $${i++}`); vals.push(from); }
    if (to) { cond.push(`closed_at <= $${i++}`); vals.push(to); }
    const where = `WHERE ${cond.join(' AND ')}`;
    const q = `SELECT closed_at AS ts, pnl FROM paper_trades ${where} ORDER BY closed_at ASC LIMIT ${limit}`;
    const { rows } = await db.query(q, vals);
    let eq = base;
    const points = [];
    for (const r of rows) {
      eq += Number(r.pnl || 0);
      points.push({ ts: Number(r.ts), equity: Number(eq) });
    }
    const last = points[points.length - 1];
    return { points, lastTs: last ? last.ts : null, lastEq: last ? last.equity : base };
  }
}

async function loadNewEquityPoints(filters, sinceTs, lastEq) {
  const { symbol, strategy, params, to } = filters;
  const cond = ["status='CLOSED'", `closed_at > $1`];
  const vals = [sinceTs];
  let i = 2;
  if (symbol) { cond.push(`symbol=$${i++}`); vals.push(symbol); }
  if (strategy) { cond.push(`strategy=$${i++}`); vals.push(strategy); }
  if (params) { cond.push(`params @> $${i++}`); vals.push(JSON.stringify(params)); }
  if (to) { cond.push(`closed_at <= $${i++}`); vals.push(to); }
  const q = `SELECT closed_at AS ts, pnl FROM paper_trades WHERE ${cond.join(' AND ')} ORDER BY closed_at ASC`;
  const { rows } = await db.query(q, vals);
  const points = [];
  let eq = lastEq;
  let lastTs = sinceTs;
  for (const r of rows) {
    eq += Number(r.pnl || 0);
    lastTs = Number(r.ts);
    points.push({ ts: lastTs, equity: eq });
  }
  return { points, lastTs, lastEq: eq };
}

router.get('/live/equity', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const filters = parseFilters(req.query);
  try {
    const { points } = await loadEquitySeries(filters);
    res.json({ ok: true, filters, equity: points });
  } catch (e) {
    console.error('[/live/equity] error:', e);
    res.status(500).json({ ok: false, error: 'db_error' });
  }
});

  router.get('/live/equity-stream', async (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.setHeader('x-request-id', req.reqId);
    res.write('retry: 3000\n\n');
    const send = (obj) => {
      res.write(`data: ${JSON.stringify({ ...obj, reqId: req.reqId })}\n\n`);
      sseEventsSent.inc({ event: obj.type || 'message' });
    };

  const filters = parseFilters(req.query);
    let { points, lastTs, lastEq } = await loadEquitySeries(filters);
    send({ type: 'init', filters, equity: points });
    sseConnections.inc();

  let releaseListen = null;
  try {
    releaseListen = await listen('equity_update', async () => {
      const r = await loadNewEquityPoints(filters, lastTs ?? 0, lastEq);
      r.points.forEach(p => send({ type: 'append', point: p }));
      lastTs = r.lastTs;
      lastEq = r.lastEq;
    });
  } catch {
    releaseListen = null;
  }

  const pollIv = setInterval(async () => {
    const r = await loadNewEquityPoints(filters, lastTs ?? 0, lastEq);
    r.points.forEach(p => send({ type: 'append', point: p }));
    lastTs = r.lastTs;
    lastEq = r.lastEq;
  }, 5000);

    const hb = setInterval(() => {
      res.write('event: ping\n');
      res.write(`data: ${JSON.stringify({ ts: Date.now(), reqId: req.reqId })}\n\n`);
      sseEventsSent.inc({ event: 'ping' });
    }, 25000);

    req.on('close', () => {
      clearInterval(pollIv);
      clearInterval(hb);
      if (releaseListen) releaseListen();
      try { res.end(); } catch {}
      sseConnections.dec();
    });
  });

export function equityRoutes(app) {
  app.use(router);
}
