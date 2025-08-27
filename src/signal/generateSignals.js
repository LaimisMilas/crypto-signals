import { rsi14Instrumented } from './indicators/rsi14.js';
import { atr14Instrumented } from './indicators/atr.js';
import { trendInstrumented } from './indicators/trend.js';
import { bullishEngulfingInstrumented } from './indicators/patterns.js';
import { aiScoreInstrumented } from './indicators/ai.js';
import { noteSignal, noteSuppressed, noteMissingCandles, noteDataStaleness } from './instrumentation.js';

export function generateSignals(candles, params) {
  const { symbol = 'SOLUSDT', interval = '1m', strategy = params?.strategy || 'default' } = params || {};
  if (!Array.isArray(candles) || candles.length < 20) return [];

  // Duomenų kokybė
  const lastTs = candles[candles.length - 1].timestamp || candles[candles.length - 1].ts;
  const expectedMs = intervalToMs(interval); // susirašyk helperį ('1m'->60000)
  const gaps = countGaps(candles, expectedMs);
  if (gaps > 0) noteMissingCandles(symbol, interval, gaps);
  noteDataStaleness(symbol, interval, Math.max(0, (Date.now() - lastTs) / 1000));

  // Indikatoriai
  const [rsi, atr, trend, engulf, ai] = [
    rsi14Instrumented({ candles, symbol, interval, strategy }),
    atr14Instrumented({ candles, symbol, interval, strategy }),
    trendInstrumented({ candles, symbol, interval, strategy }),
    bullishEngulfingInstrumented({ candles, symbol, interval, strategy }),
    aiScoreInstrumented({ candles, symbol, interval, strategy })
  ];

  // Tavo logika – pavyzdys:
  const signals = [];
  const lastClose = candles.at(-1).close;

  const wantBuy = trend === 'up' && rsi?.value < 40 && engulf === true && (ai?.value ?? 0) >= 0.5;
  if (wantBuy) {
    signals.push({ side: 'BUY', price: lastClose, ts: lastTs });
    noteSignal({ strategy, symbol, interval, side: 'BUY' });
  } else {
    noteSuppressed({ strategy, reason: reasonFrom(wantBuy) }); // 'filters_not_met' ir pan.
  }

  // ... SELL logika analogiškai → noteSignal({ side:'SELL' })
  return signals;
}

// --- helperiai ---
function intervalToMs(intv) { return intv === '1m' ? 60_000 : 60_000; }
function countGaps(c, step) {
  let gaps = 0;
  for (let i = 1; i < c.length; i++) {
    const dt = (c[i].timestamp || c[i].ts) - (c[i - 1].timestamp || c[i - 1].ts);
    if (dt > step * 1.5) gaps++;
  }
  return gaps;
}
function reasonFrom(wantBuy) { return wantBuy ? 'emitted' : 'filters_not_met'; }
