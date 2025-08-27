import { atr } from '../../indicators/atr.js';

export function computeATR14(candles) {
  const value = atr(candles, 14);
  return value == null ? null : { value };
}

