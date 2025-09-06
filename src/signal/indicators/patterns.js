import { timeIndicator } from '../instrumentation.js';
import { detectBullishEngulfing, detectBearishEngulfing, detectDoji, detectSupportResistance } from './patterns.core.js';

export function bullishEngulfingInstrumented({ candles, symbol, interval, strategy }) {
  return timeIndicator({ indicator: 'bullish_engulfing', symbol, interval, strategy }, detectBullishEngulfing, candles);
}

export function bearishEngulfingInstrumented({ candles, symbol, interval, strategy }) {
  return timeIndicator({ indicator: 'bearish_engulfing', symbol, interval, strategy }, detectBearishEngulfing, candles);
}

export function dojiInstrumented({ candles, symbol, interval, strategy }) {
  return timeIndicator({ indicator: 'doji', symbol, interval, strategy }, detectDoji, candles);
}

export function supportResistanceInstrumented({ candles, symbol, interval, strategy }) {
  return timeIndicator({ indicator: 'support_resistance', symbol, interval, strategy }, detectSupportResistance, candles);
}

