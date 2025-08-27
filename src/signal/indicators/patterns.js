import { timeIndicator } from '../instrumentation.js';
import { detectBullishEngulfing } from './patterns.core.js';

export function bullishEngulfingInstrumented({ candles, symbol, interval, strategy }) {
  return timeIndicator({ indicator: 'bullish_engulfing', symbol, interval, strategy }, detectBullishEngulfing, candles);
}
