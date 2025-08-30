import { db } from '../storage/db.js';
import { lttb } from './overlayPerf.js';

export async function writeSnapshot({ ts = Date.now(), equity, source = 'live' }) {
  if (equity == null || !isFinite(Number(equity))) throw new Error('equity required');
  const t = Number(ts);
  await db.query(`
    INSERT INTO equity_snapshots(ts, equity, source)
    VALUES ($1,$2,$3)
    ON CONFLICT (ts) DO UPDATE SET equity=EXCLUDED.equity, source=EXCLUDED.source
  `, [t, Number(equity), String(source)]);
  return { ts: t, equity: Number(equity), source: String(source) };
}

export async function readSeries({ from, to, limit, source = 'live', ds, n }) {
  const now = Date.now();
  const toMs = to ? Number(to) : now;
  const fromMs = from ? Number(from) : (toMs - 30 * 24 * 3600 * 1000);
  const lim = Math.max(10, Math.min(100000, Number(limit) || 0)) || null;
  const params = [source, fromMs, toMs];
  const limSql = lim ? `LIMIT ${lim}` : '';
  const { rows } = await db.query(`
    SELECT ts, equity
    FROM equity_snapshots
    WHERE source=$1 AND ts BETWEEN $2 AND $3
    ORDER BY ts ASC
    ${limSql}
  `, params);

  let items = rows.map(r => ({ ts: Number(r.ts), equity: Number(r.equity) }));
  if (ds === 'lttb' && items.length) {
    const nn = Math.max(100, Math.min(10000, Number(n) || 1500));
    items = lttb(items, nn);
  }
  return { items, asOf: now };
}
