import client from 'prom-client';

export const httpRequests = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status']
});

export const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
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
  help: 'Job durations',
  labelNames: ['type', 'status']
});

export const jobQueueDepth = new client.Gauge({
  name: 'job_queue_depth',
  help: 'Job queue depth'
});

export const jobArtifactsSize = new client.Gauge({
  name: 'job_artifacts_size_bytes',
  help: 'Job artifacts size'
});

export function metricsRouter(app) {
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  });
}
