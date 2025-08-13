import fs from 'fs';
import { evaluate } from '../strategy/sidewaysReversal.js';

const file = process.argv[2] || 'candles.json';
const candles = JSON.parse(fs.readFileSync(file,'utf-8'));

let position = null;
let pnl = 0;
let wins = 0, losses = 0, trades = 0;

for (let i = 21; i < candles.length; i++) {
  const slice = candles.slice(0, i + 1);
  const sig = evaluate(slice);
  const last = slice[slice.length-1];

  if (!position && sig?.type === 'BUY') {
    position = { entry: sig.entry, tp: sig.tp, sl: sig.sl };
    trades++;
  } else if (position) {
    const hi = last.high, lo = last.low;
    if (position.tp && hi >= position.tp) {
      pnl += (position.tp - position.entry);
      wins++;
      position = null;
    } else if (position.sl && lo <= position.sl) {
      pnl += (position.sl - position.entry);
      losses++;
      position = null;
    }
  }
}

console.log({ trades, wins, losses, pnl });
