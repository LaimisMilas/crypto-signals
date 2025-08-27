export function computeTrend(candles) { /* ... RETURN: 'up'|'down'|'range' */ }

import { timeIndicator } from '../instrumentation.js';
export function trendInstrumented(meta) {
  const { candles } = meta;
  return timeIndicator({ ...meta, indicator: 'trend' }, computeTrend, candles);
}
