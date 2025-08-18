#!/usr/bin/env node
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import { generateSignals } from '../src/strategy.js';
import { loadCandles, computeMetrics } from '../src/backtest/utils.js';

const args = process.argv.slice(2);
let start = args[0] || '2023-01-01';
let end = args[1] || '2024-01-01';
let trainDays = 60;
let testDays = 30;

for (let i = 2; i < args.length; i++) {
  if (args[i] === '--train') trainDays = Number(args[++i]);
  if (args[i] === '--test')  testDays  = Number(args[++i]);
}

const dayMs = 24 * 60 * 60 * 1000;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// === output -> client/public ===
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientPublicDir = path.join(__dirname, '..', 'client', 'public');
if (!fs.existsSync(clientPublicDir)) fs.mkdirSync(clientPublicDir, { recursive: true });

const outCsvPath = path.join(clientPublicDir, 'walkforward.csv');
const headers = [
  'trainStart','trainEnd','testStart','testEnd',
  'rsiBuy','rsiSell','atrMult','adxMin',
  'trades','closedTrades','winRate','pnl','maxDrawdown','score'
];

function ensureCsvHeader() {
  if (!fs.existsSync(outCsvPath) || fs.readFileSync(outCsvPath, 'utf-8').trim() === '') {
    fs.writeFileSync(outCsvPath, headers.join(',') + '\n');
  }
}

function toISODate(ms) {
  const d = new Date(ms);
  return d.toISOString().slice(0, 10);
}

(async () => {
  ensureCsvHeader();

  const startMs = Date.parse(start);
  const endMs   = Date.parse(end);
  let cur = startMs;

  while (true) {
    const trainStart = cur;
    const trainEnd   = trainStart + trainDays * dayMs;
    const testStart  = trainEnd;
    const testEnd    = testStart + testDays * dayMs;
    if (testEnd > endMs) break;

    const trainCandles = await loadCandles(pool, trainStart, trainEnd);
    if (trainCandles.length < 300) {
      console.warn('Per mažai žvakių treniravimo lange – stabdom walk-forward.');
      break;
    }

    const grid = {
      rsiBuy:  [25, 30, 35],
      rsiSell: [65, 70, 75],
      atrMult: [1.5, 2, 2.5],
      adxMin:  [12, 15, 18, 20],
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
              best = { rsiBuy: rBuy, rsiSell: rSell, atrMult: mult, adxMin, ...m };
            }
          }
        }
      }
    }

    if (!best) {
      console.warn('Nepavyko atrinkti geriausių parametrų – stabdom.');
      break;
    }

    const testCandles = await loadCandles(pool, testStart, testEnd);
    const { trades: testTrades, pnl: testPnl } = generateSignals(testCandles, {
      rsiBuy: best.rsiBuy,
      rsiSell: best.rsiSell,
      atrMult: best.atrMult,
      adxMin: best.adxMin,
      useTrendFilter: true,
      feePct: 0.0005,
      slippagePct: 0.0005,
      positionSize: 1,
    });
    const testM = computeMetrics(testTrades, testPnl);

    const row = {
      trainStart: toISODate(trainStart),
      trainEnd:   toISODate(trainEnd),
      testStart:  toISODate(testStart),
      testEnd:    toISODate(testEnd),
      rsiBuy:     best.rsiBuy,
      rsiSell:    best.rsiSell,
      atrMult:    best.atrMult,
      adxMin:     best.adxMin,
      trades:     testM.trades,
      closedTrades: testM.closedTrades,
      winRate:    testM.winRate,
      pnl:        testM.pnl,
      maxDrawdown:testM.maxDrawdown,
      score:      testM.score,
    };

    console.log('\n=== WALK-FORWARD FOLD ===');
    console.log(row);

    const line = headers.map(h => row[h]).join(',') + '\n';
    fs.appendFileSync(outCsvPath, line);

    cur = testEnd;
  }

  console.log(`\nSaved ${outCsvPath}`);
  await pool.end();
})().catch(async (e) => {
  console.error(e);
  await pool.end();
  process.exit(1);
});
