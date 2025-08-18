// src/backtest/utils.js

/**
 * Užkrauna žvakes iš Postgres "candles" lentelės.
 * @param {import('pg').Pool} pool - PG pool instance
 * @param {number} startMs - laikotarpio pradžia (ms since epoch, įskaitant)
 * @param {number} endMs   - laikotarpio pabaiga (ms since epoch, neįskaitant)
 * @returns {Promise<Array<{ts:number,open:number,high:number,low:number,close:number,volume:number}>>}
 */
export async function loadCandles(pool, startMs, endMs) {
  const { rows } = await pool.query(
    `SELECT ts, open, high, low, close, volume
     FROM candles
     WHERE ts >= $1::bigint AND ts < $2::bigint
     ORDER BY ts ASC`,
    [startMs, endMs]
  );
  return rows.map(r => ({
    ts: Number(r.ts),
    open: Number(r.open),
    high: Number(r.high),
    low: Number(r.low),
    close: Number(r.close),
    volume: Number(r.volume),
  }));
}

/**
 * Apskaičiuoja metrikas iš sandorių masyvo.
 * @param {Array<{ts:number, side?:'BUY'|'SELL', price:number, pnl?:number}>} trades
 * @param {number} pnl - bendras PnL, grąžintas iš backtest/engine
 * @returns {{trades:number,closedTrades:number,winRate:number,pnl:number,maxDrawdown:number,score:number}}
 */
export function computeMetrics(trades, pnl) {
  const closed = trades.filter(t => typeof t.pnl === 'number');

  // equity kreivė + max drawdown
  let eq = 0, peak = -Infinity, maxDD = 0, wins = 0;
  for (const t of closed) {
    eq += t.pnl;
    if (eq > peak) peak = eq;
    const dd = peak - eq;
    if (dd > maxDD) maxDD = dd;
    if (t.pnl > 0) wins++;
  }

  const winRate = closed.length ? (wins / closed.length) * 100 : 0;
  const score = pnl / (1 + Math.max(0, maxDD));

  return {
    trades: trades.length,
    closedTrades: closed.length,
    winRate: Number(winRate.toFixed(2)),
    pnl: Number(pnl.toFixed(2)),
    maxDrawdown: Number(maxDD.toFixed(2)),
    score: Number(score.toFixed(4)),
  };
}

/**
 * Patogus helperis datoms paversti į ms.
 * Priima 'YYYY-MM-DD' arba jau ms (number).
 * @param {string|number} d
 * @returns {number}
 */
export function toMillis(d) {
  if (typeof d === 'number') return d;
  return Date.parse(d);
}
