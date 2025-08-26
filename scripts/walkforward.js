#!/usr/bin/env node
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import { generateSignals } from '../src/strategies/ema.js';
import { loadCandles, computeMetrics } from '../src/backtest/utils.js';

const args = process.argv.slice(2);
const startStr = args[0];
const endStr = args[1];
let trainDays = 60;
let testDays = 30;
for (let i = 2; i < args.length; i++) {
  const a = args[i];
  if (a === '--train') trainDays = Number(args[++i]);
  else if (a === '--test') testDays = Number(args[++i]);
}

const startMs = Date.parse(startStr);
const endMs = Date.parse(endStr);
if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs >= endMs) {
  console.error('Invalid <start> or <end> dates');
  process.exit(1);
}
if (!(trainDays > 0) || !(testDays > 0)) {
  console.error('train/test days must be > 0');
  process.exit(1);
}

const dayMs = 24 * 60 * 60 * 1000;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientPublicDir = path.join(__dirname, '..', 'client', 'public');
fs.mkdirSync(clientPublicDir, { recursive: true });
const csvPath = path.join(clientPublicDir, 'walkforward.csv');
const aggPath = path.join(clientPublicDir, 'walkforward-agg.csv');
const summaryPath = path.join(clientPublicDir, 'walkforward-summary.json');
const headers = [
  'trainStart','trainEnd','testStart','testEnd',
  'rsiBuy','rsiSell','atrMult','adxMin',
  'trades','closedTrades','winRate','pnl','maxDrawdown','score'
];

function toISODate(ms) { return new Date(ms).toISOString().slice(0,10); }
function fmtNum(v, d=2){ const n=Number(v); return Number.isFinite(n)?Number(n.toFixed(d)):0; }
function fmtInt(v){ const n=Number(v); return Number.isFinite(n)?Math.round(n):0; }

const rows = [];
const equitySeries = [];
const summary = { folds:0, trades:0, closedTrades:0, wins:0, pnl:0, bestParamsCount:{} };
let cur = startMs;

(async () => {
  while (true) {
    const trainStart = cur;
    const trainEnd = trainStart + trainDays*dayMs;
    const testStart = trainEnd;
    const testEnd = testStart + testDays*dayMs;
    if (testStart >= endMs || testEnd > endMs) break;

    const trainCandles = await loadCandles(pool, trainStart, trainEnd);
    if (trainCandles.length < 300) break;

    const grid = {
      rsiBuy:  [25,30,35],
      rsiSell: [65,70,75],
      atrMult: [1.5,2,2.5],
      adxMin:  [12,15,18,20],
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
            const sc = Number(m.score);
            if (Number.isFinite(sc) && (!best || sc > best.score)) {
              best = { rsiBuy: rBuy, rsiSell: rSell, atrMult: mult, adxMin, score: sc };
            }
          }
        }
      }
    }
    if (!best) { cur = testEnd; continue; }
    const comboKey = `rsiBuy=${best.rsiBuy};rsiSell=${best.rsiSell};atrMult=${best.atrMult};adxMin=${best.adxMin}`;
    summary.bestParamsCount[comboKey] = (summary.bestParamsCount[comboKey] || 0) + 1;

    const testCandles = await loadCandles(pool, testStart, testEnd);
    if (testCandles.length === 0) { cur = testEnd; continue; }
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
    const m = computeMetrics(testTrades, testPnl);
    if (!Number.isFinite(m.score)) { cur = testEnd; continue; }

    const closed = testTrades.filter(t => typeof t.pnl === 'number');
    const winsFold = closed.filter(t => t.pnl > 0).length;
    const foldPnl = closed.reduce((s,t)=>s+(t.pnl||0),0);

    summary.folds++;
    summary.trades += fmtInt(m.trades);
    summary.closedTrades += fmtInt(m.closedTrades);
    summary.wins += winsFold;
    summary.pnl += foldPnl;
    const cum = (equitySeries.length?equitySeries[equitySeries.length-1]:0) + foldPnl;
    equitySeries.push(cum);

    const row = {
      trainStart: toISODate(trainStart),
      trainEnd: toISODate(trainEnd),
      testStart: toISODate(testStart),
      testEnd: toISODate(testEnd),
      rsiBuy: fmtNum(best.rsiBuy),
      rsiSell: fmtNum(best.rsiSell),
      atrMult: fmtNum(best.atrMult),
      adxMin: fmtNum(best.adxMin),
      trades: fmtInt(m.trades),
      closedTrades: fmtInt(m.closedTrades),
      winRate: fmtNum(m.winRate,2),
      pnl: fmtNum(m.pnl,2),
      maxDrawdown: fmtNum(m.maxDrawdown,2),
      score: fmtNum(m.score,4),
    };
    rows.push(row);
    cur = testEnd;
  }

  const csvLines = [headers.join(',')];
  for (const r of rows) csvLines.push(headers.map(h => r[h]).join(','));
  fs.writeFileSync(csvPath, csvLines.join('\n'));

  const aggLines = ['idx,equity'];
  equitySeries.forEach((eq,i)=>aggLines.push(`${i+1},${fmtNum(eq,2)}`));
  fs.writeFileSync(aggPath, aggLines.join('\n'));

  let peak = -Infinity, maxDD = 0;
  for (const eq of equitySeries) {
    if (eq > peak) peak = eq;
    const dd = peak - eq;
    if (dd > maxDD) maxDD = dd;
  }
  const globalWR = summary.closedTrades ? (summary.wins / summary.closedTrades) * 100 : 0;
  const summaryObj = {
    folds: summary.folds,
    trades: summary.trades,
    closedTrades: summary.closedTrades,
    pnl: fmtNum(summary.pnl,2),
    winRate: fmtNum(globalWR,2),
    maxDrawdown: fmtNum(maxDD,2),
    bestParamsCount: summary.bestParamsCount,
  };
  fs.writeFileSync(summaryPath, JSON.stringify(summaryObj, null, 2));

  console.table(rows.slice(0,10));
  console.log(summaryObj);
  console.log('Saved: client/public/walkforward.csv, client/public/walkforward-agg.csv, client/public/walkforward-summary.json');
  await pool.end();
})().catch(async e => {
  console.error(e);
  await pool.end();
  process.exit(1);
});

