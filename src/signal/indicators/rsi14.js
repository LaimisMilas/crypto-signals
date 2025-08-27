import { timeIndicator } from '../instrumentation.js';
import { computeRSI14 } from './rsi14.core.js';

export function rsi14Instrumented({ candles, symbol, interval, strategy }) {
  return timeIndicator({ indicator: 'rsi14', symbol, interval, strategy }, computeRSI14, candles);
}
