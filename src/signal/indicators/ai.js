import { timeIndicator } from '../instrumentation.js';

export async function aiScore(candles) { /* ... RETURN: { value: <0..1> } */ }

export function aiScoreInstrumented({ candles, symbol, interval, strategy }) {
  return timeIndicator({ indicator: 'ai_score', symbol, interval, strategy }, aiScore, candles);
}
