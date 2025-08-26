#!/usr/bin/env node
import 'dotenv/config';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateSignals } from '../src/strategies/ema.js';
import { loadCandles, computeMetrics } from '../src/backtest/utils.js';

const args = process.argv.slice(2);
const start = args[0] ?? '2024-01-01';
const end = args[1] ?? '2024-03-01';
let adxVals = [12, 15, 18, 20];
let WRITE_BEST = false;
for (const arg of args.slice(2)) {
  if (arg === '--write-best') WRITE_BEST = true;
  else adxVals = arg.split(',').map(Number);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  const candles = await loadCandles(pool, start, end);
  if (candles.length < 300) {
    console.error('Not enough candles for optimization');
    process.exit(1);
  }

  const grid = {
    rsiBuy: [25, 30, 35],
    rsiSell: [65, 70, 75],
    atrMult: [1.5, 2, 2.5],
    adxMin: adxVals,
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
            rsiBuy: Number(rBuy),
            rsiSell: Number(rSell),
            atrMult: Number(mult),
            adxMin: Number(adxMin),
            trades: Number(m.trades || 0),
            closedTrades: Number(m.closedTrades || 0),
            winRate: Number((m.winRate ?? 0).toFixed(2)),
            pnl: Number((m.pnl ?? 0).toFixed(2)),
            maxDrawdown: Number((m.maxDrawdown ?? 0).toFixed(2)),
            score: Number((m.score ?? 0).toFixed(2)),
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

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const clientPublicDir = path.join(__dirname, '..', 'client', 'public');
  if (!fs.existsSync(clientPublicDir)) fs.mkdirSync(clientPublicDir, { recursive: true });
  fs.writeFileSync(path.join(clientPublicDir, 'optimize.csv'), csv);
  console.log('Saved: client/public/optimize.csv');
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

