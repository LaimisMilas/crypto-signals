export function runBacktest({ ts, open, high, low, close }, { rsiArr, atrArr }, params) {
  const {
    rsiBuy=30, rsiSell=70,
    atrMult=2,
    positionSize=1.0,       // kiek vienetų (pvz. 1 BTC)
    feePct=0.0005,          // 0.05% per side
    slippagePct=0.0005      // 0.05% įėjimui/išėjimui
  } = params;

  let pos = 0, entry = 0, stop = 0;
  const trades = [];

  const applyCost = (px, side) => {
    // BUY: kaina "brangesnė", SELL: "pigiau" realizuojam
    const slip = side === 'BUY' ? (1 + slippagePct) : (1 - slippagePct);
    const fee  = side === 'BUY' ? (1 + feePct)      : (1 - feePct);
    return px * slip * fee;
  };

  for (let i = 1; i < close.length; i++) {
    const r = rsiArr[i], a = atrArr[i];
    if (!a || !r) continue;

    if (pos === 0 && r <= rsiBuy) {
      pos = 1;
      entry = applyCost(close[i], 'BUY');
      stop = entry - atrMult * a;
      trades.push({ ts: ts[i], side: 'BUY', price: entry });
    } else if (pos === 1) {
      // stop
      if (low[i] <= stop) {
        const exitRaw = stop;
        const exit = applyCost(exitRaw, 'SELL');
        trades.push({ ts: ts[i], side: 'SELL', price: exit, pnl: (exit - entry) * positionSize });
        pos = 0; entry = 0; stop = 0;
      }
      // overbought
      else if (r >= rsiSell) {
        const exit = applyCost(close[i], 'SELL');
        trades.push({ ts: ts[i], side: 'SELL', price: exit, pnl: (exit - entry) * positionSize });
        pos = 0; entry = 0; stop = 0;
      } else {
        // trail
        const trail = close[i] - atrMult * a;
        stop = Math.max(stop, trail);
      }
    }
  }

  const pnl = trades.filter(t => 'pnl' in t).reduce((s,t)=>s+t.pnl,0);
  return { trades, pnl };
}

