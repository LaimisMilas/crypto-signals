export function ema(values, period) {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let ema = values.slice(-period).reduce((a,b)=>a+b,0) / period;
  for (let i = values.length - period + 1; i < values.length; i++) {
    ema = values[i]*k + ema*(1-k);
  }
  return ema;
}

export function getTrend(candles) {
  const closes = candles.map(c=>c.close);
  const e9 = ema(closes, 9);
  const e21 = ema(closes, 21);
  if (e9 == null || e21 == null) return 'flat';
  if (e9 > e21) return 'up';
  if (e9 < e21) return 'down';
  return 'flat';
}
