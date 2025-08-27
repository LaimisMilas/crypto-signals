import { timeIndicator } from '../instrumentation.js';
import { computeTrend } from './trend.core.js';

export function trendInstrumented({ candles, symbol, interval, strategy }) {
  return timeIndicator({ indicator: 'trend', symbol, interval, strategy }, computeTrend, candles);
}
