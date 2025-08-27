import { getTrend } from '../../strategy/trend.js';

export function computeTrend(candles) {
  return getTrend(candles);
}

