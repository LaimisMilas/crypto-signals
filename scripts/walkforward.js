#!/usr/bin/env node
import 'dotenv/config';
import fs from 'fs';
import { Pool } from 'pg';
import { generateSignals } from '../src/strategy.js';
import { loadCandles, computeMetrics } from '../src/backtest/utils.js';

const args = process.argv.slice(2);
let start = args[0] || '2023-01-01';
let end = args[1] || '2024-01-01';
let trainDays = 60;
let testDays = 30;
for (let i = 2; i < args.length; i++) {
  if (args[i] === '--train') {
    trainDays = Number(args[++i]);
  } else if (args[i] === '--test') {
    testDays = Number(args[++i]);
  }
}

const dayMs = 24 * 60 * 60 * 1000;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  const results = [];
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  let cur = startMs;

  while (true) {
    const trainStart = cur;
    const trainEnd = trainStart + trainDays * dayMs;
    const testStart = trainEnd;
    const testEnd = testStart + testDays * dayMs;
    if (testEnd > endMs) break;

    const trainCandles = await loadCandles(pool, trainStart, trainEnd);
    if (trainCandles.length < 300) break;

    const grid = {
      rsiBuy: [25, 30, 35],
      rsiSell: [65, 70, 75],
      atrMult: [1.5, 2, 2.5],
      adxMin: [12, 15, 18, 20],
    };

    let best = null;
    for (const rBuy of grid.rsiBuy) {
      for (const rSell of grid.rsiSell) {
        for (const mult of grid.atrMult) {
          for (const adxMin of grid.adxMin) {
            const { trades, pnl } = generateSignals(trainCandles, {
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
            if (!best || m.score > best.score) {
              best = { params: { rsiBuy: rBuy, rsiSell: rSell, atrMult: mult, adxMin }, score: m.score };
            }
          }
        }
      }
    }

    if (!best) break;

    const testCandles = await loadCandles(pool, testStart, testEnd);
    const { trades: testTrades, pnl: testPnl } = generateSignals(testCandles, {
      ...best.params,
      useTrendFilter: true,
      feePct: 0.0005,
      slippagePct: 0.0005,
      positionSize: 1,
    });
    const metrics = computeMetrics(testTrades, testPnl);

    const line = {
      trainStart: new Date(trainStart).toISOString().slice(0, 10),
      trainEnd: new Date(trainEnd).toISOString().slice(0, 10),
      testStart: new Date(testStart).toISOString().slice(0, 10),
      testEnd: new Date(testEnd).toISOString().slice(0, 10),
      rsiBuy: best.params.rsiBuy,
      rsiSell: best.params.rsiSell,
      atrMult: best.params.atrMult,
      adxMin: best.params.adxMin,
      pnl: metrics.pnl,
      winRate: metrics.winRate,
      maxDrawdown: metrics.maxDrawdown,
    };
    results.push(line);

    console.log(`Train ${line.trainStart}-${line.trainEnd}, Test ${line.testStart}-${line.testEnd}, Params ${JSON.stringify(best.params)}, PnL ${metrics.pnl.toFixed(2)}, WinRate ${metrics.winRate.toFixed(2)}, MaxDD ${metrics.maxDrawdown.toFixed(2)}`);

    cur += testDays * dayMs;
  }

  if (results.length) {
    const headers = ['trainStart','trainEnd','testStart','testEnd','rsiBuy','rsiSell','atrMult','adxMin','pnl','winRate','maxDrawdown'];
    const csv = [headers.join(','), ...results.map(r => headers.map(h => r[h]).join(','))].join('\n');
    fs.writeFileSync('walkforward.csv', csv);

    const avgPnL = results.reduce((s,r) => s + r.pnl, 0) / results.length;
    const avgWin = results.reduce((s,r) => s + r.winRate, 0) / results.length;
    const avgDD = results.reduce((s,r) => s + r.maxDrawdown, 0) / results.length;
    console.log(`Average PnL ${avgPnL.toFixed(2)}, Avg WinRate ${avgWin.toFixed(2)}, Avg MaxDD ${avgDD.toFixed(2)}`);
  }

  await pool.end();
})().catch(async e => {
  console.error(e);
  await pool.end();
  process.exit(1);
});
