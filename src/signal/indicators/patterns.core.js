import { bullishEngulfing } from '../../indicators/patterns.js';

export function detectBullishEngulfing(candles) {
  if (!Array.isArray(candles) || candles.length < 2) return false;
  const [c1, c2] = candles.slice(-2);
  return bullishEngulfing(c1, c2);
}

