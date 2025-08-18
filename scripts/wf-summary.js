#!/usr/bin/env node
import fs from 'fs';

const CSV = 'walkforward.csv';
const OUT_JSON = 'walkforward-summary.json';
const OUT_AGG = 'walkforward-agg.csv';

if (!fs.existsSync(CSV)) {
  console.error(`${CSV} nerastas. Pirmiau paleisk: node scripts/walkforward.js ...`);
  process.exit(1);
}

const lines = fs.readFileSync(CSV, 'utf-8').trim().split('\n');
if (lines.length < 2) {
  console.error('walkforward.csv tuščias.');
  process.exit(1);
}
const header = lines[0].split(',');
const idx = Object.fromEntries(header.map((h,i)=>[h,i]));
const rows = lines.slice(1).map(line => line.split(','));

let folds = 0, sumPnL = 0, sumWR = 0, sumDD = 0;
const pnlSeq = [];

for (const r of rows) {
  const pnl = Number(r[idx['pnl']] ?? 0);
  const wr = Number(r[idx['winRate']] ?? 0);
  const dd = Number(r[idx['maxDrawdown']] ?? 0);
  sumPnL += pnl; sumWR += wr; sumDD += dd; folds++;
  pnlSeq.push(pnl);
}

const summary = {
  folds,
  avgPnL: Number((sumPnL / folds).toFixed(2)),
  avgWinRate: Number((sumWR / folds).toFixed(2)),
  avgMaxDD: Number((sumDD / folds).toFixed(2)),
};

fs.writeFileSync(OUT_JSON, JSON.stringify(summary, null, 2));

// aggregated equity per fold
let eq = 0;
const aggLines = ['idx,equity'];
for (let i = 0; i < pnlSeq.length; i++) {
  eq += pnlSeq[i];
  aggLines.push(`${i+1},${eq.toFixed(2)}`);
}
fs.writeFileSync(OUT_AGG, aggLines.join('\n'));

console.log('WF summary:', summary);
console.log(`Saved ${OUT_JSON}, ${OUT_AGG}`);
