#!/usr/bin/env node
import 'dotenv/config';
import { Pool } from 'pg';
import { fetchKlines } from '../src/data/binance.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Upsert į candles (ts BIGINT UNIQUE)
const UPSERT = `
INSERT INTO candles (ts, open, high, low, close, volume)
VALUES ($1,$2,$3,$4,$5,$6)
ON CONFLICT (ts) DO UPDATE SET
  open=EXCLUDED.open, high=EXCLUDED.high, low=EXCLUDED.low,
  close=EXCLUDED.close, volume=EXCLUDED.volume;
`;

// Naudojimas: node scripts/fetch-binance.js BTCUSDT 1h 2024-01-01 2024-03-01
const [,, symbol='BTCUSDT', interval='1h', start='2024-01-01', end='2024-03-01'] = process.argv;
const startMs = Date.parse(start);
const endMs   = Date.parse(end);

const INTERVAL_MS = {
  '1m': 60_000, '3m': 180_000, '5m': 300_000, '15m': 900_000,
  '30m': 1_800_000, '1h': 3_600_000, '2h': 7_200_000, '4h': 14_400_000,
  '6h': 21_600_000, '8h': 28_800_000, '12h': 43_200_000, '1d': 86_400_000
}[interval];

if (!INTERVAL_MS) {
  console.error(`Nežinomas intervalas: ${interval}`);
  process.exit(1);
}

async function main() {
  console.log(`Fetch ${symbol} ${interval} ${start}..${end}`);
  let cursor = startMs;

  while (cursor < endMs) {
    const chunkEnd = Math.min(cursor + INTERVAL_MS * 1000 /* ~ didelis blokas */, endMs);
    const klines = await fetchKlines(symbol, interval, cursor, chunkEnd);
    if (klines.length === 0) {
      cursor += INTERVAL_MS * 1000;
      continue;
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const k of klines) {
        await client.query(UPSERT, [k.ts, k.open, k.high, k.low, k.close, k.volume]);
      }
      await client.query('COMMIT');
      console.log(`+ ${klines.length} eilučių iki ${new Date(klines[klines.length-1].ts).toISOString()}`);
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('DB klaida:', e.message);
      process.exit(1);
    } finally {
      client.release();
    }
    // Binance rate-limit: nedidelė pauzė
    await new Promise(r => setTimeout(r, 250));
    // Perkeliam žymeklį į paskutinės žvakės pabaigą
    cursor = klines[klines.length-1].ts + INTERVAL_MS;
  }
  await pool.end();
  console.log('DONE');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
