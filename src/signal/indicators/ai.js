export async function aiScore(candles) { /* ... RETURN: { value: <0..1> } */ }

import { timeIndicator } from '../instrumentation.js';
export function aiScoreInstrumented(meta) {
  const { candles } = meta;
  return timeIndicator({ ...meta, indicator: 'ai_score' }, aiScore, candles);
}
