import client from 'prom-client';

export const indicatorLatency = new client.Histogram({
  name: 'indicator_latency_seconds',
  help: 'Indicator computation latency',
  labelNames: ['indicator', 'symbol', 'interval', 'strategy'],
  buckets: [0.001,0.005,0.01,0.02,0.05,0.1,0.2,0.5,1,2]
});

export const signalEmitted = new client.Counter({
  name: 'signal_emitted_total',
  help: 'Signals emitted',
  labelNames: ['strategy', 'symbol', 'interval', 'side'] // side: BUY/SELL
});

export const signalSuppressed = new client.Counter({
  name: 'signal_suppressed_total',
  help: 'Signals suppressed by risk/filters',
  labelNames: ['strategy', 'reason'] // reason: risk, cooldown, dup, drawdown_guard, etc.
});

export const dataNanInputs = new client.Counter({
  name: 'data_nan_inputs_total',
  help: 'NaN/invalid inputs detected in indicator pipeline',
  labelNames: ['indicator', 'symbol', 'interval']
});

export const dataMissingCandles = new client.Counter({
  name: 'data_missing_candles_total',
  help: 'Missing candle gaps detected',
  labelNames: ['symbol', 'interval']
});

export const dataStaleSeconds = new client.Gauge({
  name: 'data_stale_seconds',
  help: 'Age of last candle (seconds)',
  labelNames: ['symbol', 'interval']
});

export const riskRejections = new client.Counter({
  name: 'risk_rejections_total',
  help: 'Orders/signals rejected by risk module',
  labelNames: ['strategy', 'reason'] // e.g., sl_too_wide, exposure_limit, max_open_trades
});
