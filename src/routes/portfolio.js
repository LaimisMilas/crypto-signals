import express from 'express';
import { db } from '../storage/db.js';

const router = express.Router();

function parseDate(v) {
  if (!v) return null;
  const t = Date.parse(String(v));
  return Number.isNaN(t) ? null : t;
}

function parseFilters(q) {
  return {
    symbol: (q.symbol || '').toString().trim() || null,
    strategy: (q.strategy || '').toString().trim() || null,
    from: parseDate(q.from),
    to: parseDate(q.to),
  };
}

async function startingEquity() {
  const { rows } = await db.query('SELECT balance_start FROM paper_state WHERE id=1');
  return rows.length ? Number(rows[0].balance_start) : 10000;
}

async function loadAllocation(field, filters) {
  const { symbol, strategy, from, to } = filters;
  const cond = ["status='CLOSED'"];
  const vals = [];
  let i = 1;
  if (symbol && field !== 'symbol') { cond.push(`symbol=$${i++}`); vals.push(symbol); }
  if (strategy && field !== 'strategy') { cond.push(`strategy=$${i++}`); vals.push(strategy); }
  if (from) { cond.push(`closed_at >= $${i++}`); vals.push(from); }
  if (to) { cond.push(`closed_at <= $${i++}`); vals.push(to); }
  const groupCol = field === 'strategy' ? 'strategy' : 'symbol';
  const q = `SELECT ${groupCol} as k, SUM(pnl) as pnl FROM paper_trades WHERE ${cond.join(' AND ')} GROUP BY ${groupCol}`;
  const { rows } = await db.query(q, vals);
  return rows.map(r => ({ [field]: r.k, pnl: Number(r.pnl || 0) }));
}

function normalizeAllocation(arr, key) {
  const total = arr.reduce((s, r) => s + Math.abs(r.pnl), 0);
  return total ? arr.map(r => ({ [key]: r[key], value: Math.abs(r.pnl) / total })) : [];
}

async function loadRisk(filters) {
  const { symbol, strategy } = filters;
  const cond = ["status='OPEN'"];
  const vals = [];
  let i = 1;
  if (symbol) { cond.push(`symbol=$${i++}`); vals.push(symbol); }
  if (strategy) { cond.push(`strategy=$${i++}`); vals.push(strategy); }
  const q = `SELECT symbol, strategy, COALESCE(risk_pct,0) as risk_pct FROM paper_trades WHERE ${cond.join(' AND ')}`;
  const { rows } = await db.query(q, vals);
  const exposure = rows.map(r => ({ symbol: r.symbol, strategy: r.strategy, riskPct: Number(r.risk_pct) }));
  const totalRiskPct = exposure.reduce((s, r) => s + r.riskPct, 0);
  return { exposure, totalRiskPct };
}

router.get('/', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const filters = parseFilters(req.query);
  try {
    const [byStrategy, bySymbol] = await Promise.all([
      loadAllocation('strategy', filters),
      loadAllocation('symbol', filters),
    ]);
    const totalPnL = byStrategy.reduce((s, r) => s + r.pnl, 0);
    const eq = (await startingEquity()) + totalPnL;
    const allocation = {
      byStrategy: normalizeAllocation(byStrategy, 'strategy'),
      bySymbol: normalizeAllocation(bySymbol, 'symbol'),
    };
    const attribution = {
      byStrategy: byStrategy.map(r => ({ strategy: r.strategy, pnl: r.pnl, pct: totalPnL ? r.pnl / totalPnL : 0 })),
      bySymbol: bySymbol.map(r => ({ symbol: r.symbol, pnl: r.pnl, pct: totalPnL ? r.pnl / totalPnL : 0 })),
    };
    const risk = await loadRisk(filters);
    const correlation = { symbols: [], matrix: [] }; // TODO
    const summary = { equity: eq, totalPnL, maxDrawdown: null, profitFactor: null, sharpe: null, sortino: null };
    const csvBase = '/csv';
    res.json({
      filters,
      summary,
      allocation,
      risk,
      correlation,
      attribution,
      csv: {
        allocation: `${csvBase}/portfolio_allocation.csv`,
        attribution: `${csvBase}/portfolio_attribution.csv`,
        correlation: `${csvBase}/portfolio_correlation.csv`,
      },
    });
  } catch (e) {
    console.error('[/portfolio] error:', e);
    res.status(500).json({ ok: false, error: 'db_error' });
  }
});

async function csvAllocationHandler(req, res) {
  const filters = parseFilters(req.query);
  try {
    const [byStrategy, bySymbol] = await Promise.all([
      loadAllocation('strategy', filters),
      loadAllocation('symbol', filters),
    ]);
    const lines = ['type,key,pnl'];
    byStrategy.forEach(r => lines.push(['strategy', r.strategy, r.pnl].join(',')));
    bySymbol.forEach(r => lines.push(['symbol', r.symbol, r.pnl].join(',')));
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Cache-Control', 'no-store');
    res.send(lines.join('\n'));
  } catch (e) {
    console.error('[/csv/portfolio_allocation] error:', e);
    res.status(500).send('db_error');
  }
}

async function csvAttributionHandler(req, res) {
  const filters = parseFilters(req.query);
  try {
    const [byStrategy, bySymbol] = await Promise.all([
      loadAllocation('strategy', filters),
      loadAllocation('symbol', filters),
    ]);
    const total = [...byStrategy, ...bySymbol].reduce((s, r) => s + r.pnl, 0) || 0;
    const lines = ['type,key,pnl,pct'];
    byStrategy.forEach(r => lines.push(['strategy', r.strategy, r.pnl, total ? r.pnl/total : 0].join(',')));
    bySymbol.forEach(r => lines.push(['symbol', r.symbol, r.pnl, total ? r.pnl/total : 0].join(',')));
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Cache-Control', 'no-store');
    res.send(lines.join('\n'));
  } catch (e) {
    console.error('[/csv/portfolio_attribution] error:', e);
    res.status(500).send('db_error');
  }
}

async function csvCorrelationHandler(_req, res) {
  // Placeholder empty CSV
  const lines = ['symbol1,symbol2,correlation'];
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Cache-Control', 'no-store');
  res.send(lines.join('\n'));
}

export function portfolioRoutes(app) {
  app.use('/portfolio', router);
  app.get('/csv/portfolio_allocation.csv', csvAllocationHandler);
  app.get('/csv/portfolio_attribution.csv', csvAttributionHandler);
  app.get('/csv/portfolio_correlation.csv', csvCorrelationHandler);
}

export default router;
