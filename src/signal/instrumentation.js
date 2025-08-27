import {
  indicatorLatency,
  dataNanInputs,
  dataMissingCandles,
  dataStaleSeconds,
  signalEmitted,
  signalSuppressed,
  riskRejections,
} from '../metrics-signal.js';

// Returns true when indicator output is valid.
// Booleans and strings are valid; numbers must be finite; objects with
// a `value` field are checked recursively for finiteness. Anything else that's
// non-null is treated as valid so instrumentation doesn't reject unusual types.
function isValidIndicatorValue(raw) {
  if (raw == null) return false; // null or undefined
  const v = raw && typeof raw === 'object' && 'value' in raw ? raw.value : raw;
  const t = typeof v;
  if (t === 'number') return Number.isFinite(v);
  if (t === 'boolean') return true;
  if (t === 'string') return true;
  return true;
}

// Accept either: (meta, fn, ...args) OR ({ fn, indicator, ... }, ...args)
function resolveArgs(arg1, arg2) {
  if (typeof arg1 === 'object' && typeof arg2 === 'function') {
    return [arg1, arg2];
  }
  if (typeof arg1 === 'object' && arg1 && typeof arg1.fn === 'function') {
    const { fn, ...meta } = arg1;
    return [meta, fn];
  }
  return [null, null];
}

export async function timeIndicator(arg1, arg2, ...args) {
  const [meta, fn] = resolveArgs(arg1, arg2);
  if (typeof fn !== 'function') {
    console.error('[timeIndicator] invalid fn', {
      metaType: typeof arg1,
      fnType: typeof arg2,
      indicator: meta?.indicator,
    });
    return null;
  }
  const { indicator, symbol, interval, strategy } = meta;
  const end = indicatorLatency.startTimer({ indicator, symbol, interval, strategy });
  try {
    const out = await fn(...args);
    if (!isValidIndicatorValue(out)) {
      dataNanInputs.inc({ indicator, symbol, interval });
    }
    return out;
  } finally {
    end();
  }
}

export function noteMissingCandles(symbol, interval, gapCount=1) {
  dataMissingCandles.inc({ symbol, interval }, gapCount);
}

export function noteDataStaleness(symbol, interval, seconds) {
  dataStaleSeconds.set({ symbol, interval }, seconds);
}

export function noteSignal({ strategy, symbol, interval, side }) {
  signalEmitted.inc({ strategy, symbol, interval, side });
}

export function noteSuppressed({ strategy, reason='unknown' }) {
  signalSuppressed.inc({ strategy, reason });
}

export function noteRiskReject({ strategy, reason }) {
  riskRejections.inc({ strategy, reason });
}
