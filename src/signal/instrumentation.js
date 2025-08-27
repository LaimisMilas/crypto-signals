import {
  indicatorLatency,
  dataNanInputs,
  dataMissingCandles,
  dataStaleSeconds,
  signalEmitted,
  signalSuppressed,
  riskRejections
} from '../metrics-signal.js';

const NUMERIC_INDICATORS = new Set(['rsi14', 'atr14', 'ai_score', 'adx14', 'ema', 'sma']);
const CATEGORICAL_INDICATORS = new Set(['trend', 'bullish_engulfing', 'bearish_engulfing', 'pattern']);

function isValidByType(indicator, raw) {
  if (raw == null) return false;

  // prefer nested value field when present
  const v = (raw && typeof raw === 'object' && 'value' in raw) ? raw.value : raw;

  if (NUMERIC_INDICATORS.has(indicator)) {
    return typeof v === 'number' && Number.isFinite(v);
  }

  if (CATEGORICAL_INDICATORS.has(indicator)) {
    const t = typeof v;
    return t === 'boolean' || t === 'string' || t === 'object';
  }

  // default: numbers must be finite, everything else passes
  return (typeof v !== 'number') || Number.isFinite(v);
}

// dual-signature resolver kaip buvo anksčiau (jei naudojama)
function resolveArgs(arg1, arg2) {
  if (typeof arg1 === 'object' && typeof arg2 === 'function') return [arg1, arg2];
  if (typeof arg1 === 'object' && arg1 && typeof arg1.fn === 'function') {
    const { fn, ...meta } = arg1; return [meta, fn];
  }
  return [null, null];
}

export async function timeIndicator(arg1, arg2, ...args) {
  const [meta, fn] = resolveArgs(arg1, arg2);
  if (typeof fn !== 'function') {
    console.error('[timeIndicator] invalid fn', {indicator: meta?.indicator, fnType: typeof arg2});
    return null;
  }
  const { indicator, symbol, interval, strategy } = meta;
  const end = indicatorLatency.startTimer({ indicator, symbol, interval, strategy });
  try {
    const out = await fn(...args);
    const ok = isValidByType(indicator, out);
    if (!ok) {
      if (NUMERIC_INDICATORS.has(indicator) && process.env.DEBUG_OBSERV === '1') {
        console.warn('[indicator-invalid]', { indicator, symbol, interval, typeof: typeof out });
      }
      dataNanInputs.inc({ indicator, symbol, interval });
    }
    return out;
  } finally {
    end();
  }
}

export function noteMissingCandles(symbol, interval, gapCount = 1) {
  dataMissingCandles.inc({ symbol, interval }, gapCount);
}

export function noteDataStaleness(symbol, interval, seconds) {
  dataStaleSeconds.set({ symbol, interval }, seconds);
}

export function noteSignal({ strategy, symbol, interval, side }) {
  signalEmitted.inc({ strategy, symbol, interval, side });
}

export function noteSuppressed({ strategy, reason = 'unknown' }) {
  signalSuppressed.inc({ strategy, reason });
}

export function noteRiskReject({ strategy, reason }) {
  riskRejections.inc({ strategy, reason });
}
