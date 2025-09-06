import { bullishEngulfing, bearishEngulfing, doji } from '../../indicators/patterns.js';

export function detectBullishEngulfing(candles) {
  if (!Array.isArray(candles) || candles.length < 2) return false;
  const [c1, c2] = candles.slice(-2);
  return bullishEngulfing(c1, c2);
}

export function detectBearishEngulfing(candles) {
  if (!Array.isArray(candles) || candles.length < 2) return false;
  const [c1, c2] = candles.slice(-2);
  return bearishEngulfing(c1, c2);
}

export function detectDoji(candles) {
  if (!Array.isArray(candles) || candles.length < 1) return false;
  const [c] = candles.slice(-1);
  return doji(c);
}

export function detectSupportResistance(candles) {
  if (!Array.isArray(candles) || candles.length === 0) return null;
  let support = Infinity;
  let resistance = -Infinity;
  for (const c of candles) {
    if (c.low < support) support = c.low;
    if (c.high > resistance) resistance = c.high;
  }
  return { support, resistance };
}

