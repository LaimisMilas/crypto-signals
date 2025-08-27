import { rsi } from '../../indicators/rsi.js';

export function aiScore(candles) {
  const values = candles.map(c => c.close);
  const r = rsi(values, 14);
  if (r == null) return null;
  return { value: Math.max(0, Math.min(1, r / 100)) };
}

