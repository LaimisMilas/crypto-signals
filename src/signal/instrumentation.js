import { indicatorLatency, dataNanInputs, dataMissingCandles, dataStaleSeconds, signalEmitted, signalSuppressed, riskRejections } from '../metrics-signal.js';

// Returns true when indicator output is valid.
// Gotchas: pattern detectors often return booleans and trend detectors return
// strings like 'up'/'down', so those should not count as NaN.
function isValidIndicatorValue(raw) {
  if (raw == null) return false; // null or undefined
  const v = (raw && typeof raw === 'object' && 'value' in raw) ? raw.value : raw;
  const t = typeof v;
  if (t === 'number') return Number.isFinite(v);
  if (t === 'boolean') return true;
  if (t === 'string') return true;
  // For other objects/arrays we treat them as valid; instrumentation should not
  // penalize unusual but non-null types.
  return true;
}

export async function timeIndicator({ fn, indicator, symbol, interval, strategy }, ...args) {
  const end = indicatorLatency.startTimer({ indicator, symbol, interval, strategy });
  try {
    const out = await fn(...args);
    if (!isValidIndicatorValue(out)) dataNanInputs.inc({ indicator, symbol, interval });
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
