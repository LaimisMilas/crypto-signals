#!/usr/bin/env node
import 'dotenv/config';
import { Pool } from 'pg';
import fs from 'fs';
import { generateSignals } from '../src/strategy.js';

const [,, start='2024-01-01', end='2024-03-01', writeFlag] = process.argv;
const WRITE_BEST = writeFlag === '--write-best';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function loadCandles(s, e) {
  const startMs = Date.parse(s);
  const endMs = Date.parse(e);
  const { rows } = await pool.query(
    `SELECT ts, open, high, low, close, volume
     FROM candles
     WHERE ts >= $1::bigint AND ts < $2::bigint
     ORDER BY ts ASC`,
    [startMs, endMs]
  );
  return rows.map(r => ({
    ts: Number(r.ts),
    open: Number(r.open),
    high: Number(r.high),
    low: Number(r.low),
    close: Number(r.close),
    volume: Number(r.volume),
  }));
}

function computeMetrics(trades, pnl) {
  const closed = trades.filter(t => typeof t.pnl === 'number');
  let eq = 0, peak = -Infinity, maxDD = 0;
  let wins = 0;
  for (const t of closed) {
    eq += t.pnl;
    if (eq > peak) peak = eq;
    const dd = peak - eq;
    if (dd > maxDD) maxDD = dd;
    if (t.pnl > 0) wins++;
  }
  const winRate = closed.length ? (wins / closed.length) * 100 : 0;
  const score = pnl / (1 + Math.max(0, maxDD));
  return {
    trades: trades.length,
    closedTrades: closed.length,
    winRate: Number(winRate.toFixed(2)),
    pnl: Number(pnl.toFixed(2)),
    maxDrawdown: Number(maxDD.toFixed(2)),
    score: Number(score.toFixed(4)),
  };
}

(async () => {
  const candles = await loadCandles(start, end);
  if (candles.length < 300) {
    console.error('Not enough candles for optimization');
    process.exit(1);
  }

  const grid = {
    rsiBuy: [25, 30, 35],
    rsiSell: [65, 70, 75],
    atrMult: [1.5, 2, 2.5],
    adxMin: [12, 15, 18, 20],
  };

  const results = [];
  for (const rBuy of grid.rsiBuy) {
    for (const rSell of grid.rsiSell) {
      for (const mult of grid.atrMult) {
        for (const adxMin of grid.adxMin) {
          const { trades, pnl } = generateSignals(candles, {
            rsiBuy: rBuy,
            rsiSell: rSell,
            atrMult: mult,
            adxMin,
            useTrendFilter: true,
            feePct: 0.0005,
            slippagePct: 0.0005,
            positionSize: 1,
          });
          const m = computeMetrics(trades, pnl);
          results.push({
            rsiBuy: rBuy,
            rsiSell: rSell,
            atrMult: mult,
            adxMin,
            ...m,
          });
        }
      }
    }
  }

  results.sort((a, b) => b.score - a.score);
  console.table(results.slice(0, 15));

  const headers = ['rsiBuy','rsiSell','atrMult','adxMin','trades','closedTrades','winRate','pnl','maxDrawdown','score'];
  const csv = [
    headers.join(','),
    ...results.map(r => headers.map(h => r[h]).join(',')),
  ].join('\n');
  fs.writeFileSync('optimize.csv', csv);
  console.log('Saved optimize.csv');
  if (WRITE_BEST && results.length) {
    const best = results[0];
    const paramsPath = new URL('../config/params.json', import.meta.url);
    const newParams = {
        rsiBuy: best.rsiBuy,
        rsiSell: best.rsiSell,
        atrMult: best.atrMult,
        adxMin: best.adxMin,
        useTrendFilter: true,
        feePct: 0.0005,
        slippagePct: 0.0005,
        positionSize: 1
    };
    fs.writeFileSync(paramsPath, JSON.stringify(newParams, null, 2));
    console.log('Updated config/params.json with best params:', newParams);
    }

  await pool.end();
})().catch(async e => {
  console.error(e);
  await pool.end();
  process.exit(1);
});

