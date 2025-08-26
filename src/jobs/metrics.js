import { MeterProvider } from '@opentelemetry/sdk-metrics';
import { jobQueueDepth } from '../observability/metrics.js';

let meter;
try {
  const { sdk } = await import('../observability/otel.js');
  meter = sdk?.getMeterProvider?.().getMeter('crypto-signals');
} catch {
  // ignore
}
if (!meter) {
  meter = new MeterProvider().getMeter('noop');
}

const queueSize = meter.createObservableGauge('jobs.queue.size');
const queueAge = meter.createObservableGauge('jobs.queue.oldest_age_ms');
const tradesCtr = meter.createCounter('runner.trades.executed');

export function observeQueue(fn) {
  meter.addBatchObservableCallback(async obs => {
    const m = await fn();
    if (!m) return;
    obs.observe(queueSize, m.size);
    obs.observe(queueAge, m.oldestAgeMs);
    jobQueueDepth.set(m.size);
  }, [queueSize, queueAge]);
}

export function markTradeExecuted() {
  tradesCtr.add(1);
}
