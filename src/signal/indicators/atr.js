export function computeATR14(candles) { /* ... */ }

import { timeIndicator } from '../instrumentation.js';
export function atr14Instrumented({ candles, symbol, interval, strategy }) {
  return timeIndicator({ indicator: 'atr14', symbol, interval, strategy }, computeATR14, candles);
}
