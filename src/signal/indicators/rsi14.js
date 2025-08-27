import { timeIndicator } from '../instrumentation.js';

// Tavo originali funkcija (palik kaip yra)
export function computeRSI14(candles) {
  // ... grąžina { value, series? }
}

export function rsi14Instrumented({ candles, symbol, interval, strategy }) {
  return timeIndicator({ indicator: 'rsi14', symbol, interval, strategy }, computeRSI14, candles);
}
