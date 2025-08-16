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

export function ema(values, period=200) {
  const out = Array(values.length).fill(null);
  if (values.length === 0) return out;
  const k = 2 / (period + 1);
  // seed: paprastas SMA iš pirmų 'period' reikšmių
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v == null) { out[i] = (i === 0 ? null : out[i-1]); continue; }
    if (i < period) {
      sum += v;
      out[i] = null;
      if (i === period - 1) out[i] = sum / period;
      continue;
    }
    out[i] = (v - out[i-1]) * k + out[i-1];
  }
  return out;
}

// Patikimesnis ADX (Wilder RMA), grąžina masyvą to paties ilgio kaip candles
export function adx(candles, period = 14) {
  const n = candles.length;
  const out = Array(n).fill(null);
  if (n < period + 2) return out;

  const plusDM = Array(n).fill(0);
  const minusDM = Array(n).fill(0);
  const tr = Array(n).fill(0);

  for (let i = 1; i < n; i++) {
    const upMove = candles[i].high - candles[i-1].high;
    const downMove = candles[i-1].low - candles[i].low;

    plusDM[i] = (upMove > 0 && upMove > downMove) ? upMove : 0;
    minusDM[i] = (downMove > 0 && downMove > upMove) ? downMove : 0;

    const highLow = candles[i].high - candles[i].low;
    const highClose = Math.abs(candles[i].high - candles[i-1].close);
    const lowClose  = Math.abs(candles[i].low  - candles[i-1].close);
    tr[i] = Math.max(highLow, highClose, lowClose);
  }

  // Wilder RMA
  const smooth = (arr) => {
    const s = Array(n).fill(0);
    // pirmas vidurkis = suma pirmų 'period' reikšmių
    let sum = 0;
    for (let i = 1; i <= period; i++) sum += arr[i];
    s[period] = sum;
    for (let i = period+1; i < n; i++) {
      s[i] = s[i-1] - (s[i-1] / period) + arr[i];
    }
    return s;
  };

  const trS = smooth(tr);
  const pdmS = smooth(plusDM);
  const mdmS = smooth(minusDM);

  const pDI = Array(n).fill(null);
  const mDI = Array(n).fill(null);
  const dx  = Array(n).fill(null);

  for (let i = period; i < n; i++) {
    if (trS[i] === 0) continue;
    const p = (pdmS[i] / trS[i]) * 100;
    const m = (mdmS[i] / trS[i]) * 100;
    pDI[i] = p;
    mDI[i] = m;
    dx[i]  = (Math.abs(p - m) / (p + m)) * 100;
  }

  // ADX = RMA(DX)
  // pradinė reikšmė – DX vidurkis per 'period'
  let sumDX = 0;
  let start = period;
  while (start < n && dx[start] == null) start++;
  if (start + period > n) return out;

  for (let i = start; i < start + period; i++) sumDX += dx[i] ?? 0;
  out[start + period - 1] = sumDX / period;

  for (let i = start + period; i < n; i++) {
    out[i] = ((out[i-1] * (period - 1)) + (dx[i] ?? 0)) / period;
  }

  return out;
}