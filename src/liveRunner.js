// Minimal live runner supporting multiple strategies
import { db } from './storage/db.js';
import { getStrategyById } from './strategies/index.js';

async function selectRecentCandles(client, symbol, limit = 500) {
  const { rows } = await client.query(
    `SELECT ts, open, high, low, close, volume
       FROM candles
       WHERE symbol = $1
       ORDER BY ts DESC
       LIMIT $2`, [symbol, limit]
  );
  return rows.reverse().map(r => ({
    ts: Number(r.ts),
    open: Number(r.open),
    high: Number(r.high),
    low: Number(r.low),
    close: Number(r.close),
    volume: Number(r.volume),
  }));
}

async function openTrade(client, { ts, side, price, strategyId, params, symbol }) {
  await client.query(
    `INSERT INTO paper_trades (ts, side, price, status, strategy, params, symbol, opened_at, entry_price)
     VALUES ($1,$2,$3,'OPEN',$4,$5,$6,$1,$3)`,
    [ts, side, price, strategyId, JSON.stringify(params || {}), symbol]
  );
}

async function closeTrade(client, { ts, price, strategyId, symbol }) {
  const { rows } = await client.query(
    `SELECT id, entry_price FROM paper_trades
       WHERE status='OPEN' AND strategy=$1 AND symbol=$2
       ORDER BY id ASC LIMIT 1`, [strategyId, symbol]
  );
  if (!rows.length) return;
  const tr = rows[0];
  const pnl = (price - Number(tr.entry_price));
  await client.query(
    `UPDATE paper_trades
       SET status='CLOSED', exit_price=$1, closed_at=$2, pnl=$3
       WHERE id=$4`,
    [price, ts, pnl, tr.id]
  );
}

export async function runOnce(liveConfig) {
  const { symbols = [], strategies = [] } = liveConfig;
  const client = await db.connect();
  try {
    for (const symbol of symbols) {
      const candles = await selectRecentCandles(client, symbol, 500);
      for (const sCfg of strategies) {
        const strat = getStrategyById(sCfg.id);
        if (!strat) continue;
        const params = { ...strat.defaultParams, ...(sCfg.params || {}) };
        const { trades } = strat.generateSignals(candles, params);
        const last = trades[trades.length - 1];
        if (!last) continue;
        if (last.side === 'BUY') {
          await openTrade(client, { ts: last.ts, side: 'BUY', price: last.price, strategyId: strat.id, params, symbol });
        } else if (last.side === 'SELL') {
          await closeTrade(client, { ts: last.ts, price: last.price, strategyId: strat.id, symbol });
        }
      }
    }
  } finally {
    client.release();
  }
}
