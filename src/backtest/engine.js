import { rsi, atr } from './indicators.js';

export function runBacktest(candles, { period = 14, atrMult = 2 } = {}) {
  let position = null;
  let pnl = 0;
  let trades = 0, wins = 0, losses = 0;

  for (let i = period + 1; i < candles.length; i++) {
    const slice = candles.slice(0, i + 1);
    const closes = slice.map(c => c.close);
    const r = rsi(closes, period);
    const a = atr(slice, period);
    const last = slice[slice.length - 1];

    if (!position && r !== null && r < 30) {
      const entry = last.close;
      position = { entry, sl: entry - atrMult * a, tp: entry + atrMult * a };
      trades++;
    } else if (position) {
      if (last.low <= position.sl) {
        pnl += position.sl - position.entry;
        losses++;
        position = null;
      } else if (last.high >= position.tp) {
        pnl += position.tp - position.entry;
        wins++;
        position = null;
      } else if (r !== null && r > 70) {
        const exit = last.close;
        pnl += exit - position.entry;
        if (exit > position.entry) wins++; else losses++;
        position = null;
      }
    }
  }

  return { trades, wins, losses, pnl };
}

