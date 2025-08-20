import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { db } from './storage/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function intervalToMs(interval) {
  const map = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
  };
  if (!map[interval]) throw new Error(`Unsupported interval ${interval}`);
  return map[interval];
}

export async function selectLastTs(client) {
  const { rows } = await client.query('SELECT MAX(ts) AS max FROM candles');
  const v = rows[0]?.max;
  return v == null ? null : Number(v);
}

export async function fetchKlines(symbol, interval, startTime, limit = 1000) {
  const params = new URLSearchParams({
    symbol,
    interval,
    startTime: String(startTime),
    limit: String(limit)
  });
  const url = `https://api.binance.com/api/v3/klines?${params.toString()}`;
  const { data } = await axios.get(url);
  return data.map(k => ({
    ts: k[0],
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
    volume: Number(k[5]),
  }));
}

export async function upsertCandles(client, rows) {
  if (!rows.length) return 0;
  const values = [];
  const params = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    params.push(`($${i*6+1},$${i*6+2},$${i*6+3},$${i*6+4},$${i*6+5},$${i*6+6})`);
    values.push(r.ts, r.open, r.high, r.low, r.close, r.volume);
  }
  const sql = `
    INSERT INTO candles(ts, open, high, low, close, volume)
    VALUES ${params.join(',')}
    ON CONFLICT (ts) DO UPDATE
      SET open=EXCLUDED.open,
          high=EXCLUDED.high,
          low=EXCLUDED.low,
          close=EXCLUDED.close,
          volume=EXCLUDED.volume
  `;
  await client.query('BEGIN');
  try {
    await client.query(sql, values);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  }
  return rows.length;
}

export async function ingestOnce() {
  const paramsPath = path.join(__dirname, '..', 'config', 'params.json');
  let cfg = {};
  try {
    const text = await fs.readFile(paramsPath, 'utf-8');
    cfg = JSON.parse(text);
  } catch {}
  const symbol = cfg.symbol || 'BTCUSDT';
  const interval = cfg.interval || '1h';
  const intervalMs = intervalToMs(interval);

  const client = await db.connect();
  try {
    const lastTs = await selectLastTs(client);
    const now = Date.now();
    const start = lastTs != null ? lastTs + intervalMs : now - 365 * 24 * 60 * 60 * 1000;
    const end = now - intervalMs;
    let cursor = start;
    let inserted = 0;
    let last = lastTs;
    while (cursor <= end) {
      const rows = await fetchKlines(symbol, interval, cursor);
      if (!rows.length) break;
      await upsertCandles(client, rows);
      inserted += rows.length;
      last = rows[rows.length - 1].ts;
      cursor = last + intervalMs;
    }
    return { inserted, from: start, to: last ?? start };
  } finally {
    client.release();
  }
}

export async function getIngestHealth() {
  const { rows } = await db.query('SELECT MAX(ts) AS last, COUNT(*) AS rows FROM candles');
  const lastTs = rows[0]?.last ? Number(rows[0].last) : null;
  const count = rows[0]?.rows ? Number(rows[0].rows) : 0;
  return { lastTs, rows: count };
}

