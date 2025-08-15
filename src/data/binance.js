import axios from 'axios';
import { cfg } from '../config.js';

const MAX_LIMIT = 1000;

export async function fetchKlines({ startTime, limit = MAX_LIMIT } = {}) {
  const url = `${cfg.binanceBase}/api/v3/klines`;
  const params = { symbol: cfg.symbol, interval: cfg.interval, limit };
  if (startTime) params.startTime = startTime;
  const { data } = await axios.get(url, { params });
  return data.map(k => ({
    ts: k[0],
    open: +k[1],
    high: +k[2],
    low: +k[3],
    close: +k[4],
    volume: +k[5]
  }));
}

export async function upsertCandles(db, candles) {
  for (const c of candles) {
    await db.query(
      `INSERT INTO candles (ts, open, high, low, close, volume)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (ts) DO UPDATE SET
         open = EXCLUDED.open,
         high = EXCLUDED.high,
         low = EXCLUDED.low,
         close = EXCLUDED.close,
         volume = EXCLUDED.volume`,
      [c.ts, c.open, c.high, c.low, c.close, c.volume]
    );
  }
}
