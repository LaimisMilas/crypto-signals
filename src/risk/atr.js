/**
 * Average True Range (ATR) calculation using Wilder's RMA method.
 * Input candles array must be in chronological order (oldest first).
 *
 * @param {Array<{high:number, low:number, close:number}>} candles
 * @param {number} period ATR period, default 14
 * @returns {{ atr: number, atrSeries: number[], trSeries: number[] }}
 */
export function computeATR(candles, period = 14) {
  if (!Array.isArray(candles) || candles.length < period + 1) {
    return { atr: NaN, atrSeries: [], trSeries: [] };
  }

  const trSeries = [];
  for (let i = 1; i < candles.length; i++) {
    const h = Number(candles[i].high);
    const l = Number(candles[i].low);
    const pc = Number(candles[i - 1].close);
    const tr = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
    trSeries.push(tr);
  }

  // Wilder's RMA
  let atr = trSeries.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const atrSeries = [atr];
  for (let i = period; i < trSeries.length; i++) {
    atr = (atr * (period - 1) + trSeries[i]) / period;
    atrSeries.push(atr);
  }

  return { atr, atrSeries, trSeries };
}

export default { computeATR };

