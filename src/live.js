// src/live.js — paper trading su Postgres saugojimu
import { Pool } from 'pg';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateSignals } from './strategy.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientPublicDir = path.join(__dirname, '..', 'client', 'public');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// kas kiek laiko perbėgam (ms)
const LOOP_MS = 60 * 1000;

// vidinė būsena tik dėl timerio
let loopTimer = null;

// užtikrinam, kad bus kur rašyt JSON metriką
async function ensurePublicDir() {
  await fsp.mkdir(clientPublicDir, { recursive: true }).catch(() => {});
}

async function getState(client) {
  const { rows } = await client.query(`SELECT running, since, balance_start FROM paper_state WHERE id=1`);
  if (!rows.length) {
    return { running: false, since: null, balance_start: 10000 };
  }
  return rows[0];
}

async function setState(client, fields) {
  const keys = Object.keys(fields);
  if (!keys.length) return;
  const setSql = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const vals = keys.map(k => fields[k]);
  await client.query(`UPDATE paper_state SET ${setSql} WHERE id=1`, vals);
}

async function selectRecentCandles(client, limit = 500) {
  const { rows } = await client.query(
    `SELECT ts, open, high, low, close, volume
     FROM candles
     ORDER BY ts DESC
     LIMIT $1`, [limit]
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

async function selectLastPaperTradeTs(client) {
  const { rows } = await client.query(`SELECT ts FROM paper_trades ORDER BY ts DESC LIMIT 1`);
  return rows.length ? Number(rows[0].ts) : 0;
}

async function insertPaperTrade(client, t) {
  // t: { ts, side, price, size=1, pnl? }
  await client.query(
    `INSERT INTO paper_trades(ts, side, price, size, pnl)
     VALUES ($1,$2,$3,$4,$5)`,
    [Number(t.ts), String(t.side), Number(t.price), Number(t.size ?? 1), (t.pnl == null ? null : Number(t.pnl))]
  );
}

async function equityNow(client) {
  const { rows } = await client.query(`SELECT balance_start FROM paper_state WHERE id=1`);
  const base = rows.length ? Number(rows[0].balance_start) : 10000;
  const { rows: sumRows } = await client.query(`SELECT COALESCE(SUM(pnl),0) AS s FROM paper_trades`);
  const sum = Number(sumRows[0].s || 0);
  return base + sum;
}

async function lastTrades(client, n = 50) {
  const { rows } = await client.query(
    `SELECT ts, side, price, size, pnl
     FROM paper_trades
     ORDER BY ts DESC
     LIMIT $1`, [n]
  );
  return rows.map(r => ({
    ts: Number(r.ts),
    side: r.side,
    price: Number(r.price),
    size: Number(r.size),
    pnl: (r.pnl == null ? null : Number(r.pnl)),
  })).reverse(); // chronologine seka
}

// Vienas ciklo „žingsnis“: paimam žvakes → sugeneruojam signalus → paimam tik NAUJUS trade įrašus → įrašom į DB → perskaičiuojam equity → išrašom JSON
async function step() {
  const client = await pool.connect();
  try {
    const state = await getState(client);
    if (!state.running) return;

    const candles = await selectRecentCandles(client, 500);
    if (candles.length < 100) return;

    // naudosim optimizuotus parametrus iš config/params.json
    const paramsPath = path.join(__dirname, '..', 'config', 'params.json');
    const params = JSON.parse(fs.readFileSync(paramsPath, 'utf-8'));

    const { trades: stratTrades } = generateSignals(candles, params);
    if (!stratTrades.length) return;

    // kad nedubliuot — žinom paskutinį įrašytą ts
    const lastDbTs = await selectLastPaperTradeTs(client);
    const newOnes = stratTrades.filter(t => Number(t.ts) > lastDbTs);

    if (newOnes.length) {
      for (const t of newOnes) {
        await insertPaperTrade(client, t);
      }
    }

    // paruošiam live-metrics.json frontendui
    const eq = await equityNow(client);
    const trades50 = await lastTrades(client, 50);
    await ensurePublicDir();
    const payload = {
      running: true,
      since: state.since,
      equity: Number(eq.toFixed(2)),
      pnl: Number((eq - state.balance_start).toFixed(2)),
      trades: trades50,
      updatedAt: new Date().toISOString()
    };
    await fsp.writeFile(path.join(clientPublicDir, 'live-metrics.json'), JSON.stringify(payload, null, 2));
  } finally {
    client.release();
  }
}

// Viešos API funkcijos (naudos src/index.js route’ai)
export async function startLive() {
  const client = await pool.connect();
  try {
    await setState(client, { running: true, since: new Date().toISOString() });
  } finally {
    client.release();
  }
  if (!loopTimer) loopTimer = setInterval(step, LOOP_MS);
}

export async function stopLive() {
  const client = await pool.connect();
  try {
    await setState(client, { running: false });
  } finally {
    client.release();
  }
  if (loopTimer) clearInterval(loopTimer);
  loopTimer = null;
}

export async function resetLive() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM paper_trades');
    await client.query('UPDATE paper_state SET running = FALSE, since = NULL, balance_start = 10000 WHERE id=1');
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
  if (loopTimer) clearInterval(loopTimer);
  loopTimer = null;
  await ensurePublicDir();
  await fsp.writeFile(path.join(clientPublicDir, 'live-metrics.json'),
    JSON.stringify({ running: false, since: null, equity: 10000, pnl: 0, trades: [], updatedAt: new Date().toISOString() }, null, 2)
  );
}

export async function getLiveState() {
  const client = await pool.connect();
  try {
    const state = await getState(client);
    const eq = await equityNow(client);
    const t10 = await lastTrades(client, 10);
    return {
      running: state.running,
      since: state.since,
      equity: Number(eq.toFixed(2)),
      pnl: Number((eq - state.balance_start).toFixed(2)),
      trades: t10
    };
  } finally {
    client.release();
  }
}

// paleidžiam loop jei state.running=true po restarto
(async () => {
  const client = await pool.connect();
  try {
    const state = await getState(client);
    if (state.running && !loopTimer) {
      loopTimer = setInterval(step, LOOP_MS);
    }
  } finally {
    client.release();
  }
})();

