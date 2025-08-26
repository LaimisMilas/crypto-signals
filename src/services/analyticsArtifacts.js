import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { db } from '../storage/db.js';

const cache = new Map(); // key -> { data, ts, mtime }
const TTL_MS = 10 * 60 * 1000;

function _key(jobId, p, mtimeMs){ return `${jobId}|${p}|${mtimeMs}`; }

export async function listArtifacts(jobId){
  const { rows } = await db.query(
    'SELECT id, kind, label, path, size_bytes, created_at FROM job_artifacts WHERE job_id=$1 ORDER BY created_at ASC',
    [jobId]
  );
  return rows;
}

function readCSVFile(filePath){
  const text = fs.readFileSync(filePath, 'utf8');
  return parse(text, { columns: true, skip_empty_lines: true, trim: true });
}

export async function readArtifactCSV(jobId, artifactPath){
  const p = path.resolve(artifactPath);
  const stat = fs.statSync(p);
  const key = _key(jobId, p, stat.mtimeMs);
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && (now - hit.ts) < TTL_MS) return hit.data;
  const rows = readCSVFile(p);
  cache.clear(); // simple LRU imitation
  cache.set(key, { data: rows, ts: now, mtime: stat.mtimeMs });
  return rows;
}

export function normalizeEquity(rows){
  if (!rows.length) return [];
  const timeKey = ['ts','time','date','datetime'].find(k => k in rows[0]) || 'ts';
  const equityKey = ['equity','balance','value','pv'].find(k => k in rows[0]) || 'equity';
  return rows.map(r => ({
    ts: Number(r[timeKey] ?? r[timeKey.toLowerCase()]),
    equity: Number(r[equityKey] ?? r[equityKey.toLowerCase()])
  })).filter(p => Number.isFinite(p.ts) && Number.isFinite(p.equity));
}

export function normalizeTrades(rows){
  const k = (r, candidates) => candidates.find(c => c in r);
  return rows.map(r => ({
    ts_open: Number(r[k(r, ['ts_open','open_ts','entry_ts','opened_at'])]),
    ts_close: Number(r[k(r, ['ts_close','close_ts','exit_ts','closed_at'])]),
    side: String(r[k(r, ['side','direction'])] ?? '').toUpperCase(),
    qty: Number(r[k(r, ['qty','quantity','size'])]),
    entry: Number(r[k(r, ['entry','entry_price','open_price'])]),
    exit: Number(r[k(r, ['exit','exit_price','close_price'])]),
    pnl: Number(r[k(r, ['pnl','pnl_usd','profit'])]),
  })).filter(t => Number.isFinite(t.ts_open) && Number.isFinite(t.ts_close));
}
