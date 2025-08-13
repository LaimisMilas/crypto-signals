export function aroon(candles, period = 14) {
  if (candles.length < period) return null;
  let highest = -Infinity, lowest = Infinity, idxHigh = 0, idxLow = 0;
  for (let i = candles.length - period, j=0; i < candles.length; i++, j++) {
    const c = candles[i];
    if (c.high >= highest) { highest = c.high; idxHigh = j; }
    if (c.low  <= lowest)  { lowest  = c.low;  idxLow  = j; }
  }
  const up = ((period - 1 - idxHigh) / (period - 1)) * 100;
  const down = ((period - 1 - idxLow)  / (period - 1)) * 100;
  return { up, down };
}
