import { rsi } from '../../indicators/rsi.js';

export function computeRSI14(candles) {
  const values = candles.map(c => c.close);
  const value = rsi(values, 14);
  return value == null ? null : { value };
}

