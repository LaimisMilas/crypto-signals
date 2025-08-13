import { rsi } from '../indicators/rsi.js';
import { atr } from '../indicators/atr.js';
import { aroon } from '../indicators/aroon.js';
import { bullishEngulfing, bearishEngulfing } from '../indicators/patterns.js';
import { getTrend } from './trend.js';

export function evaluate(candles) {
  if (candles.length < 22) return null;
  const closes = candles.map(c=>c.close);
  const last = candles[candles.length-1];
  const prev = candles[candles.length-2];

  const R = rsi(closes, 14);
  const A = atr(candles, 14);
  const Ar = aroon(candles, 14);
  const trend = getTrend(candles);

  const isBullish = bullishEngulfing(prev, last);
  const isBearish = bearishEngulfing(prev, last);

  if (trend === 'up' && R != null && R < 40 && isBullish) {
    const entry = last.close;
    const sl = entry - 1.0 * A;
    const tp = entry + 1.5 * A;
    return { type: 'BUY', entry, sl, tp, rsi: R, atr: A, aroon_up: Ar?.up, aroon_down: Ar?.down, reason: 'trend up + RSI<40 + bullish_engulfing' };
  }

  if (isBearish || (R != null && R > 70)) {
    return { type: 'SELL', entry: last.close, rsi: R, atr: A, aroon_up: Ar?.up, aroon_down: Ar?.down, reason: 'bearish or RSI>70' };
  }

  return null;
}
