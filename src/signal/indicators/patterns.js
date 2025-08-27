export function detectBullishEngulfing(candles) { /* ... RETURN: boolean */ }

import { timeIndicator } from '../instrumentation.js';
export function bullishEngulfingInstrumented(meta) {
  const { candles } = meta;
  return timeIndicator({ ...meta, indicator: 'bullish_engulfing' }, detectBullishEngulfing, candles);
}
