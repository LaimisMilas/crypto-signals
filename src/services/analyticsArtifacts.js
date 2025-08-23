import fs from 'fs/promises';
import path from 'path';
import { db } from '../storage/db.js';

// Simple in-memory cache for parsed CSV artifacts
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const csvCache = new Map(); // key: file path -> { mtimeMs, ts, rows }

function parseCSV(str) {
  const lines = str.trim().split(/\r?\n/);
  const header = lines.shift()?.split(',').map(h => h.trim()) || [];
  return lines.map(line => {
    const cols = line.split(',');
    const obj = {};
    header.forEach((h, i) => {
      obj[h] = (cols[i] || '').trim();
    });
    return obj;
  });
}

export async function listArtifacts(jobId) {
  const q = 'SELECT id, job_id, path, mime, size FROM job_artifacts WHERE job_id=$1 ORDER BY id';
  const { rows } = await db.query(q, [jobId]);
  return rows;
}

export async function readArtifactCSV(filePath) {
  const abs = path.resolve(filePath);
  const stat = await fs.stat(abs);
  const cached = csvCache.get(abs);
  if (cached && cached.mtimeMs === stat.mtimeMs && (Date.now() - cached.ts) < CACHE_TTL_MS) {
    return cached.rows;
  }
  const data = await fs.readFile(abs, 'utf8');
  const rows = parseCSV(data);
  csvCache.set(abs, { mtimeMs: stat.mtimeMs, ts: Date.now(), rows });
  return rows;
}

function parseTs(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  if (!Number.isNaN(n)) {
    // assume ms if large
    if (n > 1e12) return n;
    if (n > 1e9) return n * 1000;
  }
  const d = Date.parse(String(v));
  return Number.isNaN(d) ? null : d;
}

export function normalizeEquity(rows) {
  if (!rows.length) return [];
  const cols = Object.keys(rows[0]);
  const tsCol = cols.find(c => /^(ts|time|date)$/i.test(c)) || cols[0];
  const eqCol = cols.find(c => /^(equity|balance)$/i.test(c)) || cols[1];
  return rows.map(r => ({
    ts: parseTs(r[tsCol]),
    equity: r[eqCol] !== undefined ? Number(r[eqCol]) : null,
  })).filter(r => r.ts !== null && r.equity !== null);
}

export function normalizeTrades(rows) {
  if (!rows.length) return [];
  const cols = Object.keys(rows[0]);
  const find = (patterns, def) => {
    const re = new RegExp(patterns.join('|'), 'i');
    return cols.find(c => re.test(c)) || def;
  };
  const openCol = find(['ts_open', 'open_ts', 'opened', 'open_time', 'time_open', 'entry_ts']);
  const closeCol = find(['ts_close', 'close_ts', 'closed', 'close_time', 'time_close', 'exit_ts']);
  const sideCol = find(['side', 'direction', 'type']);
  const qtyCol = find(['qty', 'quantity', 'amount', 'size']);
  const entryCol = find(['entry', 'entry_price', 'open_price', 'price_in']);
  const exitCol = find(['exit', 'exit_price', 'close_price', 'price_out']);
  const pnlCol = find(['pnl', 'profit', 'pnl_value', 'pl']);
  return rows.map(r => ({
    ts_open: parseTs(r[openCol]),
    ts_close: parseTs(r[closeCol]),
    side: r[sideCol] || null,
    qty: r[qtyCol] !== undefined ? Number(r[qtyCol]) : null,
    entry: r[entryCol] !== undefined ? Number(r[entryCol]) : null,
    exit: r[exitCol] !== undefined ? Number(r[exitCol]) : null,
    pnl: r[pnlCol] !== undefined ? Number(r[pnlCol]) : null,
  })).filter(t => t.ts_open !== null || t.ts_close !== null);
}

export async function fetchEquity(jobId) {
  const arts = await listArtifacts(jobId);
  const a = arts.find(x => /equity\.csv$|oos_equity\.csv$/i.test(x.path));
  if (!a) throw new Error('equity artifact not found');
  const rows = await readArtifactCSV(a.path);
  const equity = normalizeEquity(rows);
  return { equity, artifact: a };
}

export async function fetchTrades(jobId) {
  const arts = await listArtifacts(jobId);
  const a = arts.find(x => /trades\.csv$/i.test(x.path));
  if (!a) throw new Error('trades artifact not found');
  const rows = await readArtifactCSV(a.path);
  const trades = normalizeTrades(rows);
  return { trades, artifact: a };
}
