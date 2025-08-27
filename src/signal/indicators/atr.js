import { timeIndicator } from '../instrumentation.js';
import { computeATR14 } from './atr.core.js';

export function atr14Instrumented({ candles, symbol, interval, strategy }) {
  return timeIndicator({ indicator: 'atr14', symbol, interval, strategy }, computeATR14, candles);
}
