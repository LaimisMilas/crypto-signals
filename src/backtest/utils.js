export async function loadCandles(pool, start, end) {
  const startMs = typeof start === 'string' ? Date.parse(start) : start;
  const endMs = typeof end === 'string' ? Date.parse(end) : end;
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
    volume: Number(r.volume)
  }));
}

export function computeMetrics(trades, pnl) {
  const closed = trades.filter(t => typeof t.pnl === 'number');
  let eq = 0, peak = -Infinity, maxDD = 0;
  let wins = 0;
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
    score: Number(score.toFixed(4))
  };
}
