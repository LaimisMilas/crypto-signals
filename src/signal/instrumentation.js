import {
  indicatorLatency, dataNanInputs, dataMissingCandles, dataStaleSeconds,
  signalEmitted, signalSuppressed, riskRejections
} from '../metrics-signal.js';

export async function timeIndicator(meta, fn, ...args) {
  const { indicator, symbol, interval, strategy } = meta;
  const end = indicatorLatency.startTimer({ indicator, symbol, interval, strategy });
  try {
    const out = await fn(...args);
    const v = (out?.value ?? out);
    if (v == null || Number.isNaN(v) || !Number.isFinite(v)) {
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
