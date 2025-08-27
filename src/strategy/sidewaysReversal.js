import { rsi } from '../indicators/rsi.js';
import { atr } from '../indicators/atr.js';
import { aroon } from '../indicators/aroon.js';
import { bullishEngulfing, bearishEngulfing } from '../indicators/patterns.js';
import { getTrend } from './trend.js';
import { cfg } from '../config.js';
import { timeIndicator } from '../signal/instrumentation.js';

export async function evaluate(candles) {
  if (candles.length < 22) return null;
  const closes = candles.map(c=>c.close);
  const last = candles[candles.length-1];
  const prev = candles[candles.length-2];

  const R = await timeIndicator({ fn: rsi, indicator: 'rsi14', symbol: cfg.symbol, interval: cfg.interval, strategy: 'sidewaysReversal' }, closes, 14);
  const A = await timeIndicator({ fn: atr, indicator: 'atr14', symbol: cfg.symbol, interval: cfg.interval, strategy: 'sidewaysReversal' }, candles, 14);
  const Ar = await timeIndicator({ fn: aroon, indicator: 'aroon14', symbol: cfg.symbol, interval: cfg.interval, strategy: 'sidewaysReversal' }, candles, 14);
  const trend = await timeIndicator({ fn: getTrend, indicator: 'trend', symbol: cfg.symbol, interval: cfg.interval, strategy: 'sidewaysReversal' }, candles);

  const isBullish = await timeIndicator({ fn: bullishEngulfing, indicator: 'bullish_engulfing', symbol: cfg.symbol, interval: cfg.interval, strategy: 'sidewaysReversal' }, prev, last);
  const isBearish = await timeIndicator({ fn: bearishEngulfing, indicator: 'bearish_engulfing', symbol: cfg.symbol, interval: cfg.interval, strategy: 'sidewaysReversal' }, prev, last);

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
