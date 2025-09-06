import { aroon } from '../../indicators/aroon.js';

export function computeAroon14(candles) {
  const value = aroon(candles, 14);
  return value == null ? null : value;
}

