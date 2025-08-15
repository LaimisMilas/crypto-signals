export function runBacktest({ ts, open, high, low, close }, { rsiArr, atrArr }, params) {
  const {
    rsiBuy=30, rsiSell=70,
    atrMult=2,
    positionSize=1.0
  } = params;

  let pos = 0; // 0 none, 1 long
  let entry = 0;
  let stop = 0;
  const trades = [];

  for (let i = 1; i < close.length; i++) {
    const r = rsiArr[i];
    const a = atrArr[i];

    if (!a || !r) continue;

    if (pos === 0 && r <= rsiBuy) {
      pos = 1;
      entry = close[i];
      stop = entry - atrMult * a;
      trades.push({ ts: ts[i], side: 'BUY', price: entry });
    } else if (pos === 1) {
      // stop
      if (low[i] <= stop) {
        const exit = stop;
        trades.push({ ts: ts[i], side: 'SELL', price: exit, pnl: (exit-entry)*positionSize });
        pos = 0; entry = 0; stop = 0;
      }
      // overbought
      else if (r >= rsiSell) {
        const exit = close[i];
        trades.push({ ts: ts[i], side: 'SELL', price: exit, pnl: (exit-entry)*positionSize });
        pos = 0; entry = 0; stop = 0;
      } else {
        // trail stop (paprastas – fiksuotas)
        stop = Math.max(stop, close[i] - atrMult * a);
      }
    }
  }

  const pnl = trades.filter(t => 'pnl' in t).reduce((s,t)=>s+t.pnl,0);
  return { trades, pnl };
}
