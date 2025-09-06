import { timeIndicator } from '../instrumentation.js';
import { computeAroon14 } from './aroon.core.js';

export function aroonInstrumented({ candles, symbol, interval, strategy }) {
  return timeIndicator({ indicator: 'aroon14', symbol, interval, strategy }, computeAroon14, candles);
}

