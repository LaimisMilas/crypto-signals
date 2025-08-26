import express from 'express';
import { db } from '../storage/db.js';
import { latestPrices } from '../services/marketData.js';

const router = express.Router();

function daterangeDefaults(q) {
  const to = q.to ? new Date(Number(q.to) || q.to) : new Date();
  const from = q.from ? new Date(Number(q.from) || q.from) : new Date(to.getTime() - 30 * 24 * 3600 * 1000);
  return { from, to };
}

router.get('/portfolio', async (req, res) => {
  const { from, to } = daterangeDefaults(req.query);

  const openQ = await db.query(`
    SELECT symbol,
           COALESCE(SUM(CASE WHEN side='LONG' THEN qty ELSE -qty END),0) AS net_qty,
           SUM(entry_price * qty * CASE WHEN side='LONG' THEN 1 ELSE -1 END) AS signed_notional,
           COUNT(*) FILTER (WHERE closed_at IS NULL) AS legs
    FROM paper_trades
    WHERE closed_at IS NULL
    GROUP BY symbol
    HAVING ABS(COALESCE(SUM(CASE WHEN side='LONG' THEN qty ELSE -qty END),0)) > 0
  `);

  const symbols = openQ.rows.map(r => r.symbol);
  const prices = await latestPrices(symbols);
  const holdings = openQ.rows.map(r => {
    const qty = Number(r.net_qty);
    const mkt = (prices[r.symbol] || 0) * qty;
    const avgEntry = qty !== 0 ? Number(r.signed_notional) / qty : 0;
    const price = prices[r.symbol] || 0;
    const unrealized = (price - avgEntry) * qty;
    return {
      symbol: r.symbol,
      qty,
      avg_entry: avgEntry,
      price,
      market_value: mkt,
      unrealized_pnl: unrealized
    };
  });

  const totalMV = holdings.reduce((s, h) => s + Math.abs(h.market_value), 0) || 0;
  const allocBySymbol = holdings.map(h => ({
    symbol: h.symbol,
    weight: totalMV ? Math.abs(h.market_value) / totalMV : 0
  })).sort((a, b) => b.weight - a.weight);

  const stratQ = await db.query(`
    SELECT COALESCE(strategy, 'default') AS strategy,
           SUM((CASE WHEN side='LONG' THEN 1 ELSE -1 END) * qty * (SELECT close FROM candles c WHERE c.symbol=pt.symbol ORDER BY ts DESC LIMIT 1)) AS signed_mv
    FROM paper_trades pt
    WHERE closed_at IS NULL
    GROUP BY strategy
  `);
  const totalStrat = stratQ.rows.reduce((s, r) => s + Math.abs(Number(r.signed_mv || 0)), 0) || 0;
  const allocByStrategy = stratQ.rows.map(r => ({
    strategy: r.strategy,
    weight: totalStrat ? Math.abs(Number(r.signed_mv || 0)) / totalStrat : 0
  })).sort((a, b) => b.weight - a.weight);

  const attrSym = await db.query(`
    SELECT symbol, SUM(pnl) AS pnl
    FROM paper_trades
    WHERE closed_at BETWEEN $1 AND $2
    GROUP BY symbol
    ORDER BY SUM(pnl) DESC
  `, [from, to]);
  const attrStr = await db.query(`
    SELECT COALESCE(strategy,'default') AS strategy, SUM(pnl) AS pnl
    FROM paper_trades
    WHERE closed_at BETWEEN $1 AND $2
    GROUP BY strategy
    ORDER BY SUM(pnl) DESC
  `, [from, to]);

  const retQ = await db.query(`
    WITH r AS (
      SELECT symbol,
             (close / LAG(close) OVER (PARTITION BY symbol ORDER BY ts) - 1) AS ret
      FROM candles
      WHERE ts >= (extract(epoch from now())*1000 - 30*24*3600*1000)
    )
    SELECT symbol, STDDEV_POP(ret) AS sigma
    FROM r WHERE ret IS NOT NULL GROUP BY symbol
  `);
  const sigma = Object.fromEntries(retQ.rows.map(r => [r.symbol, Number(r.sigma || 0)]));

  const gross = holdings.reduce((s, h) => s + Math.abs(h.market_value), 0);
  const net = holdings.reduce((s, h) => s + h.market_value, 0);
  const z = 1.65;
  const estVaR = holdings.reduce((s, h) => {
    const v = Math.abs(h.market_value);
    const sgm = sigma[h.symbol] || 0;
    return s + z * sgm * v;
  }, 0);
  const largest = totalMV ? Math.max(0, ...allocBySymbol.map(a => a.weight)) : 0;

  res.json({
    asOf: Date.now(),
    holdings,
    allocation: { bySymbol: allocBySymbol, byStrategy: allocByStrategy },
    risk: { gross, net, estVaR, largestWeight: largest },
    attribution: { bySymbol: attrSym.rows, byStrategy: attrStr.rows },
    correlation: { windowDays: 30 }
  });
});

router.get('/portfolio/correlation', async (req, res) => {
  const window = Math.max(5, Math.min(120, Number(req.query.window) || 30));
  const base = await db.query(`
    SELECT symbol, SUM(volume) AS vol
    FROM candles
    WHERE ts >= (SELECT MAX(ts) FROM candles) - $1::bigint * 24*3600*1000
    GROUP BY symbol
    ORDER BY SUM(volume) DESC
    LIMIT 12
  `, [window]);
  const symbols = base.rows.map(r => r.symbol);
  if (!symbols.length) return res.json({ symbols: [], matrix: [] });

  const retQ = await db.query(`
    SELECT symbol,
           (close / LAG(close) OVER (PARTITION BY symbol ORDER BY ts) - 1) AS ret
    FROM candles
    WHERE symbol = ANY($1)
      AND ts >= (SELECT MAX(ts) FROM candles) - $2::bigint * 24*3600*1000
    ORDER BY symbol, ts
  `, [symbols, window]);

  const bySym = new Map(symbols.map(s => [s, []]));
  retQ.rows.forEach(r => { if (r.ret != null) bySym.get(r.symbol).push(Number(r.ret)); });

  function pearson(a, b) {
    const n = Math.min(a.length, b.length);
    if (n < 5) return null;
    let sa = 0, sb = 0, sab = 0, saa = 0, sbb = 0;
    for (let i = 0; i < n; i++) { const x = a[i], y = b[i]; sa += x; sb += y; sab += x * y; saa += x * x; sbb += y * y; }
    const cov = sab / n - (sa / n) * (sb / n);
    const va = saa / n - (sa / n) * (sa / n);
    const vb = sbb / n - (sb / n) * (sb / n);
    const den = Math.sqrt(va * vb);
    return den > 0 ? cov / den : null;
  }

  const matrix = symbols.map(() => Array(symbols.length).fill(null));
  for (let i = 0; i < symbols.length; i++) {
    for (let j = i; j < symbols.length; j++) {
      const r = pearson(bySym.get(symbols[i]), bySym.get(symbols[j]));
      matrix[i][j] = matrix[j][i] = (r == null ? null : Number(r.toFixed(4)));
    }
  }
  res.json({ symbols, matrix, windowDays: window });
});

router.get('/portfolio/attribution', async (req, res) => {
  const { from, to } = daterangeDefaults(req.query);
  const groupBy = (req.query.groupBy === 'strategy') ? 'strategy' : 'symbol';
  const col = groupBy === 'strategy' ? "COALESCE(strategy,'default')" : 'symbol';
  const { rows } = await db.query(`
    SELECT ${col} AS key, SUM(pnl) AS pnl, COUNT(*) AS n
    FROM paper_trades
    WHERE closed_at BETWEEN $1 AND $2
    GROUP BY ${col}
    ORDER BY SUM(pnl) DESC
  `, [from, to]);
  res.json({ groupBy, items: rows });
});

export function portfolioRoutes(app) {
  app.use(router);
}

export default router;
