import assert from 'assert';
import { computeATR } from '../../src/risk/atr.js';

const candles = [
  { high: 48.70, low: 47.79, close: 48.16 },
  { high: 48.72, low: 48.14, close: 48.61 },
  { high: 48.90, low: 48.39, close: 48.75 },
  { high: 48.87, low: 48.37, close: 48.63 },
  { high: 48.82, low: 48.24, close: 48.74 },
  { high: 49.05, low: 48.64, close: 49.03 },
  { high: 49.20, low: 48.94, close: 49.07 },
  { high: 49.35, low: 48.86, close: 49.32 },
  { high: 49.92, low: 49.50, close: 49.91 },
  { high: 50.19, low: 49.87, close: 50.13 },
  { high: 50.12, low: 49.20, close: 49.53 },
  { high: 49.66, low: 48.90, close: 49.50 },
  { high: 50.19, low: 49.87, close: 50.13 },
  { high: 50.36, low: 49.26, close: 50.31 },
  { high: 50.57, low: 50.09, close: 50.52 },
];

const { atr } = computeATR(candles, 14);
assert.ok(Math.abs(atr - 0.586428571428571) < 1e-6, `ATR mismatch: ${atr}`);
console.log('atr.test passed');

