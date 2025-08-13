export function bullishEngulfing(c1, c2) {
  const isBear1 = c1.close < c1.open;
  const isBull2 = c2.close > c2.open;
  const engulf = (c2.open <= c1.close) && (c2.close >= c1.open);
  return isBear1 && isBull2 && engulf;
}

export function bearishEngulfing(c1, c2) {
  const isBull1 = c1.close > c1.open;
  const isBear2 = c2.close < c2.open;
  const engulf = (c2.open >= c1.close) && (c2.close <= c1.open);
  return isBull1 && isBear2 && engulf;
}

export function doji(c) {
  const body = Math.abs(c.close - c.open);
  const range = c.high - c.low || 1e-9;
  return (body / range) < 0.1;
}
