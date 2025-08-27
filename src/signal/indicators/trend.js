import { timeIndicator } from '../instrumentation.js';

export function computeTrend(candles) { /* ... RETURN: 'up'|'down'|'range' */ }

export function trendInstrumented({ candles, symbol, interval, strategy }) {
  return timeIndicator({ indicator: 'trend', symbol, interval, strategy }, computeTrend, candles);
}
