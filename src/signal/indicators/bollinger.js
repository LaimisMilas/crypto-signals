import { timeIndicator } from '../instrumentation.js';
import { computeBollingerBands20 } from './bollinger.core.js';

export function bollingerBandsInstrumented({ candles, symbol, interval, strategy }) {
  return timeIndicator({ indicator: 'bollinger20', symbol, interval, strategy }, computeBollingerBands20, candles);
}

