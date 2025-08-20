import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateSignals } from './strategy.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientPublicDir = path.join(__dirname, '..', 'client', 'public');

let running = false;
let trades = [];
let equity = 10000; // virtual start
let loopTimer = null;
let startTime = null;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function step() {
  const { rows } = await pool.query(`
    SELECT ts, open, high, low, close, volume
    FROM candles
    ORDER BY ts DESC
    LIMIT 300
  `);
  const candles = rows.reverse().map(r => ({
    ts: Number(r.ts),
    open: Number(r.open),
    high: Number(r.high),
    low: Number(r.low),
    close: Number(r.close),
    volume: Number(r.volume),
  }));

  const params = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'params.json'), 'utf-8'));
  const { trades: newTrades } = generateSignals(candles, params);

  // Paimam tik paskutinį signalą
  const last = newTrades[newTrades.length - 1];
  if (last && (!trades.length || trades[trades.length - 1].ts !== last.ts)) {
    trades.push(last);
    if (last.pnl !== undefined) equity += last.pnl;
    // Save metrics for frontend
    const metrics = { running, since: startTime, equity, pnl: equity - 10000, trades };
    fs.writeFileSync(path.join(clientPublicDir, 'live-metrics.json'), JSON.stringify(metrics, null, 2));
  }
}

export function startLive() {
  if (running) return;
  running = true;
  startTime = new Date().toISOString();
  loopTimer = setInterval(step, 60 * 1000);
}

export function stopLive() {
  running = false;
  if (loopTimer) clearInterval(loopTimer);
  loopTimer = null;
}

export function resetLive() {
  trades = [];
  equity = 10000;
  fs.writeFileSync(path.join(clientPublicDir, 'live-metrics.json'), JSON.stringify({ running, since: startTime, equity, pnl: 0, trades: [] }, null, 2));
}

export function getLiveState() {
  return { running, since: startTime, equity, pnl: equity - 10000, trades };
}
