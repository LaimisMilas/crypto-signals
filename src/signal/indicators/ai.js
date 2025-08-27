import { timeIndicator } from '../instrumentation.js';
import { aiScore } from './ai.core.js';

export function aiScoreInstrumented({ candles, symbol, interval, strategy }) {
  return timeIndicator({ indicator: 'ai_score', symbol, interval, strategy }, aiScore, candles);
}
