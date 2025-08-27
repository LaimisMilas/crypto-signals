import { timeIndicator } from '../instrumentation.js';

export function detectBullishEngulfing(candles) { /* ... RETURN: boolean */ }

export function bullishEngulfingInstrumented({ candles, symbol, interval, strategy }) {
  return timeIndicator({ indicator: 'bullish_engulfing', symbol, interval, strategy }, detectBullishEngulfing, candles);
}
