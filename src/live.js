// src/live.js — paper trading with risk management
import { Pool } from 'pg';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateSignals } from './strategy.js';
import { sendTradeAlert } from './notify/telegram.js';
import { markTradeExecuted } from './jobs/metrics.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientPublicDir = path.join(__dirname, '..', 'client', 'public');
const paramsPath = path.join(__dirname, '..', 'config', 'params.json');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const LOOP_MS = 60 * 1000;
let loopTimer = null;

const CFG_DEFAULTS = {
  tpPct: 0.02,
  slPct: 0.01,
  trailPct: 0,
  riskPct: 0.01,
  maxOpenTrades: 1,
  muteAlerts: false,
  symbol: 'BTCUSDT',
};

async function ensurePublicDir() {
  await fsp.mkdir(clientPublicDir, { recursive: true }).catch(() => {});
}

// --- Config helpers -------------------------------------------------------
export async function getLiveConfig() {
  try {
    const text = await fsp.readFile(paramsPath, 'utf-8');
    const cfg = JSON.parse(text);
    return { ...CFG_DEFAULTS, ...cfg };
  } catch {
    return { ...CFG_DEFAULTS };
  }
}

export async function setLiveConfig(newCfg) {
  const current = await getLiveConfig();
  const updated = { ...current };
  if (Number.isFinite(newCfg.tpPct) && newCfg.tpPct > 0) updated.tpPct = newCfg.tpPct;
  if (Number.isFinite(newCfg.slPct) && newCfg.slPct > 0) updated.slPct = newCfg.slPct;
  if (Number.isFinite(newCfg.trailPct) && newCfg.trailPct >= 0) updated.trailPct = newCfg.trailPct;
  if (Number.isFinite(newCfg.riskPct) && newCfg.riskPct > 0) updated.riskPct = newCfg.riskPct;
  if (Number.isFinite(newCfg.maxOpenTrades) && newCfg.maxOpenTrades >= 1) {
    updated.maxOpenTrades = Math.floor(newCfg.maxOpenTrades);
  }
  if (typeof newCfg.muteAlerts === 'boolean') updated.muteAlerts = newCfg.muteAlerts;
  await fsp.writeFile(paramsPath, JSON.stringify(updated, null, 2));
  return updated;
}

// --- DB helpers -----------------------------------------------------------
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

async function equityNow(client) {
  const { rows } = await client.query(`SELECT balance_start FROM paper_state WHERE id=1`);
  const base = rows.length ? Number(rows[0].balance_start) : 10000;
  const { rows: sumRows } = await client.query(`SELECT COALESCE(SUM(pnl),0) AS s FROM paper_trades`);
  const sum = Number(sumRows[0].s || 0);
  return base + sum;
}

async function lastTrades(client, n = 50) {
  const { rows } = await client.query(
    `SELECT id, ts, side, entry_price, exit_price, size, pnl
       FROM paper_trades
       WHERE status='CLOSED'
       ORDER BY ts DESC
       LIMIT $1`, [n]
  );
  return rows.map(r => ({
    id: Number(r.id),
    ts: Number(r.ts),
    side: r.side,
    entry_price: Number(r.entry_price),
    exit_price: Number(r.exit_price),
    size: Number(r.size),
    pnl: (r.pnl == null ? null : Number(r.pnl))
  })).reverse();
}

export async function getOpenPositions(client) {
  const { rows } = await client.query(`SELECT * FROM paper_trades WHERE status='OPEN' ORDER BY ts ASC`);
  return rows.map(r => ({
    id: Number(r.id),
    ts: Number(r.ts),
    side: r.side,
    price: Number(r.price),
    size: Number(r.size),
    entry_price: Number(r.entry_price),
    trail_top: (r.trail_top == null ? null : Number(r.trail_top)),
    tp_pct: (r.tp_pct == null ? null : Number(r.tp_pct)),
    sl_pct: (r.sl_pct == null ? null : Number(r.sl_pct)),
    trail_pct: (r.trail_pct == null ? null : Number(r.trail_pct)),
    risk_pct: (r.risk_pct == null ? null : Number(r.risk_pct))
  }));
}

async function openPosition(client, { ts, price, size, params }) {
  const { tpPct, slPct, trailPct, riskPct } = params;
  await client.query(
    `INSERT INTO paper_trades(ts, side, price, size, pnl, entry_price, exit_price, status, trail_top, tp_pct, sl_pct, trail_pct, risk_pct)
     VALUES($1,'BUY',$2,$3,NULL,$2,NULL,'OPEN',$2,$4,$5,$6,$7)`,
    [Number(ts), Number(price), Number(size), Number(tpPct), Number(slPct), Number(trailPct), Number(riskPct)]
  );
  if (!params.muteAlerts) {
    const symbol = params.symbol || 'BTCUSDT';
    await sendTradeAlert('OPEN', {
      symbol,
      side: 'LONG',
      entryPrice: price,
      size,
      ts,
    });
  }
  markTradeExecuted();
}

async function closePosition(client, position, { ts, price, reason = 'SIGNAL', params }) {
  const pnl = (Number(price) - Number(position.entry_price)) * Number(position.size);
  await client.query(
    `UPDATE paper_trades SET status='CLOSED', exit_price=$1, price=$1, pnl=$2 WHERE id=$3`,
    [Number(price), Number(pnl), Number(position.id)]
  );
  if (!params.muteAlerts) {
    const symbol = params.symbol || 'BTCUSDT';
    await sendTradeAlert('CLOSE', {
      symbol,
      side: 'LONG',
      exitPrice: price,
      pnl,
      reason,
      ts,
    });
  }
  markTradeExecuted();
}

async function applyRiskAndStops(client, lastPrice, ts, params) {
  const opens = await getOpenPositions(client);
  for (const p of opens) {
    const entry = Number(p.entry_price);
    const tp = entry * (1 + Number(p.tp_pct || 0));
    const sl = entry * (1 - Number(p.sl_pct || 0));
    let trailTop = Number(p.trail_top ?? entry);
    const trailPct = Number(p.trail_pct || 0);
    let hit = false;
    let reason = 'SIGNAL';
    if (Number(p.tp_pct) && lastPrice >= tp) {
      hit = true;
      reason = 'TP';
    } else if (Number(p.sl_pct) && lastPrice <= sl) {
      hit = true;
      reason = 'SL';
    } else if (trailPct > 0) {
      if (lastPrice > trailTop) {
        trailTop = lastPrice;
        await client.query(`UPDATE paper_trades SET trail_top=$1 WHERE id=$2`, [trailTop, p.id]);
      } else if (lastPrice <= trailTop * (1 - trailPct)) {
        hit = true;
        reason = 'TRAIL';
      }
    }
    if (hit) {
      await closePosition(client, p, { ts, price: lastPrice, reason, params });
    }
  }
}

// --- Main loop -----------------------------------------------------------
async function step() {
  const client = await pool.connect();
  try {
    const state = await getState(client);
    if (!state.running) return;

    const candles = await selectRecentCandles(client, 500);
    if (candles.length < 100) return;

    const params = await getLiveConfig();
    const { trades: stratTrades } = generateSignals(candles, params);
    const lastSignal = stratTrades[stratTrades.length - 1];
    const lastCandle = candles[candles.length - 1];
    const lastPrice = lastCandle.close;
    const nowTs = lastCandle.ts;

    const openPositions = await getOpenPositions(client);

    if (lastSignal) {
      if (lastSignal.side === 'BUY' && openPositions.length < params.maxOpenTrades) {
        const eq = await equityNow(client);
        const denom = lastPrice * params.slPct;
        let size = denom > 0 ? (eq * params.riskPct) / denom : 0.001;
        if (!Number.isFinite(size) || size <= 0) size = 0.001;
        size = Math.max(0.001, Number(size.toFixed(6)));
        await openPosition(client, { ts: nowTs, price: lastPrice, size, params });
      } else if (lastSignal.side === 'SELL' && openPositions.length > 0) {
        const pos = openPositions[0];
        await closePosition(client, pos, { ts: nowTs, price: lastPrice, reason: 'SIGNAL', params });
      }
    }

    await applyRiskAndStops(client, lastPrice, nowTs, params);

    const eq = await equityNow(client);
    const trades50 = await lastTrades(client, 50);
    const openNow = await getOpenPositions(client);
    await ensurePublicDir();
    const payload = {
      running: true,
      since: state.since,
      equity: Number(eq.toFixed(2)),
      pnl: Number((eq - state.balance_start).toFixed(2)),
      trades: trades50,
      openPositions: openNow,
      updatedAt: new Date().toISOString(),
    };
    await fsp.writeFile(path.join(clientPublicDir, 'live-metrics.json'), JSON.stringify(payload, null, 2));
  } finally {
    client.release();
  }
}

// --- API functions -------------------------------------------------------
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
    JSON.stringify({ running: false, since: null, equity: 10000, pnl: 0, trades: [], openPositions: [], updatedAt: new Date().toISOString() }, null, 2)
  );
}

export async function getLiveState() {
  const client = await pool.connect();
  try {
    const state = await getState(client);
    const eq = await equityNow(client);
    const t10 = await lastTrades(client, 10);
    const open = await getOpenPositions(client);
    return {
      running: state.running,
      since: state.since,
      equity: Number(eq.toFixed(2)),
      pnl: Number((eq - state.balance_start).toFixed(2)),
      trades: t10,
      openPositions: open,
    };
  } finally {
    client.release();
  }
}

// start loop if running after restart
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
