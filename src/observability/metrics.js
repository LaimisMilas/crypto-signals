import client from 'prom-client';

client.collectDefaultMetrics();

export const httpRequests = new client.Counter({
  name: 'http_requests_total',
  help: 'HTTP requests total',
  labelNames: ['method', 'route', 'status']
});

export const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5]
});

export const sseConnections = new client.Gauge({
  name: 'sse_connections',
  help: 'Active SSE connections'
});

export const sseEventsSent = new client.Counter({
  name: 'sse_events_sent_total',
  help: 'Total SSE events sent',
  labelNames: ['event']
});

export const jobDuration = new client.Histogram({
  name: 'job_duration_seconds',
  help: 'Job duration seconds',
  labelNames: ['type', 'status'],
  buckets: [0.1, 0.5, 1, 5, 15, 30, 60, 120, 300, 600]
});

export const jobArtifactsSize = new client.Gauge({
  name: 'job_artifacts_size_bytes',
  help: 'Last job artifact size bytes',
  labelNames: ['type']
});

export const jobQueueDepth = new client.Gauge({
  name: 'job_queue_depth',
  help: 'Current job queue depth'
});

export const overlayEquityPoints = new client.Counter({
  name: 'overlay_equity_points',
  help: 'Overlay equity points generated'
});

export function metricsRouter(app) {
  app.get('/metrics', async (_, res) => {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  });
}
