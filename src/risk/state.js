import { db } from '../storage/db.js';

const ID = 1;

export async function loadConfig() {
  const { rows } = await db.query('SELECT config FROM risk_limits WHERE id=$1', [ID]);
  return rows[0]?.config || {};
}

export async function saveConfig(cfg) {
  await db.query(
    'INSERT INTO risk_limits (id, config) VALUES ($1,$2) ON CONFLICT (id) DO UPDATE SET config=$2, updated_at=now()',
    [ID, cfg]
  );
}

export async function getState() {
  const { rows } = await db.query(
    'SELECT state, halt_reason, day_start, equity_day_start, equity_day_high, realized_pnl_today FROM risk_state WHERE id=$1',
    [ID]
  );
  if (!rows.length) return { state: 'RUNNING', reason: null };
  return {
    state: rows[0].state,
    reason: rows[0].halt_reason,
    day_start: rows[0].day_start,
    equity_day_start: Number(rows[0].equity_day_start || 0),
    equity_day_high: Number(rows[0].equity_day_high || 0),
    realized_pnl_today: Number(rows[0].realized_pnl_today || 0),
  };
}

export async function setState({ state, reason }) {
  await db.query(
    'INSERT INTO risk_state (id, state, halt_reason) VALUES ($1,$2,$3) ON CONFLICT (id) DO UPDATE SET state=$2, halt_reason=$3, updated_at=now()',
    [ID, state, reason]
  );
}

function todayStr(tz) {
  const d = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(d);
  const obj = {};
  for (const p of parts) obj[p.type] = p.value;
  return `${obj.year}-${obj.month}-${obj.day}`;
}

export async function ensureDayStart(equityNow) {
  const cfg = await loadConfig();
  const tz = cfg.sessions?.timezone || 'UTC';
  const today = todayStr(tz);
  const client = await db.connect();
  try {
    const { rows } = await client.query('SELECT day_start, equity_day_high FROM risk_state WHERE id=$1', [ID]);
    if (!rows.length) {
      await client.query(
        'INSERT INTO risk_state (id, day_start, equity_day_start, equity_day_high, realized_pnl_today) VALUES ($1,$2,$3,$3,0)',
        [ID, today, equityNow]
      );
      return;
    }
    const r = rows[0];
    if (r.day_start !== today) {
      await client.query(
        'UPDATE risk_state SET day_start=$2, equity_day_start=$3, equity_day_high=$3, realized_pnl_today=0, updated_at=now() WHERE id=$1',
        [ID, today, equityNow]
      );
    } else if (equityNow > Number(r.equity_day_high || 0)) {
      await client.query('UPDATE risk_state SET equity_day_high=$2, updated_at=now() WHERE id=$1', [ID, equityNow]);
    }
  } finally {
    client.release();
  }
}

export async function updateRealizedPnlToday(deltaUsd) {
  await db.query(
    'UPDATE risk_state SET realized_pnl_today = COALESCE(realized_pnl_today,0) + $2, updated_at=now() WHERE id=$1',
    [ID, Number(deltaUsd || 0)]
  );
}

export async function logHalt(action, reason, details) {
  await db.query(
    'INSERT INTO risk_halts (action, reason, details) VALUES ($1,$2,$3)',
    [action, reason, details ? JSON.stringify(details) : null]
  );
}

export async function selectRiskHalts(limit = 100) {
  const { rows } = await db.query(
    'SELECT ts, action, reason, details FROM risk_halts ORDER BY ts DESC LIMIT $1',
    [limit]
  );
  return rows;
}

export default {
  loadConfig,
  saveConfig,
  getState,
  setState,
  ensureDayStart,
  updateRealizedPnlToday,
  logHalt,
  selectRiskHalts,
};
