export function atr(candles, period = 14) {
  if (candles.length < period + 1) return null;
  const trs = [];
  for (let i = candles.length - period; i < candles.length; i++) {
    const c = candles[i], prev = candles[i - 1];
    const hl = c.high - c.low;
    const hc = Math.abs(c.high - prev.close);
    const lc = Math.abs(c.low - prev.close);
    trs.push(Math.max(hl, hc, lc));
  }
  return trs.reduce((a,b)=>a+b,0) / period;
}
