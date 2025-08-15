export function rsi(values, period=14) {
  const res = Array(values.length).fill(null);
  let gains = 0, losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i-1];
    if (diff >= 0) gains += diff; else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  res[period] = calcRsi(avgGain, avgLoss);

  for (let i = period+1; i < values.length; i++) {
    const diff = values[i] - values[i-1];
    const gain = Math.max(diff, 0);
    const loss = Math.max(-diff, 0);
    avgGain = (avgGain*(period-1) + gain) / period;
    avgLoss = (avgLoss*(period-1) + loss) / period;
    res[i] = calcRsi(avgGain, avgLoss);
  }
  return res;
}

function calcRsi(avgGain, avgLoss) {
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function atr(high, low, close, period=14) {
  const tr = [];
  for (let i = 0; i < close.length; i++) {
    if (i === 0) { tr.push(high[i]-low[i]); continue; }
    const m1 = high[i] - low[i];
    const m2 = Math.abs(high[i] - close[i-1]);
    const m3 = Math.abs(low[i] - close[i-1]);
    tr.push(Math.max(m1, m2, m3));
  }
  const out = Array(close.length).fill(null);
  let sum = 0;
  for (let i = 0; i < tr.length; i++) {
    sum += tr[i];
    if (i >= period) sum -= tr[i-period];
    if (i >= period-1) out[i] = sum / period;
  }
  return out;
}
