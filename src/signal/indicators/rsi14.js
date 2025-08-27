// Tavo originali funkcija (palik kaip yra)
export function computeRSI14(candles) {
  // ... grąžina { value, series? }
}

// Instrumentuotas wrapper
import { timeIndicator } from '../instrumentation.js';
export function rsi14Instrumented({ candles, symbol, interval, strategy }) {
  return timeIndicator({ indicator: 'rsi14', symbol, interval, strategy }, computeRSI14, candles);
}
