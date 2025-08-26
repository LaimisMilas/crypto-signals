import client from 'prom-client';

export const jobDuration = new client.Histogram({
  name: 'job_duration_seconds',
  help: 'Job duration in seconds',
  labelNames: ['type', 'status'],
  buckets: [1, 5, 10, 30, 60, 120, 300, 600]
});

export const jobArtifactsSize = new client.Gauge({
  name: 'job_artifacts_size_bytes',
  help: 'Job artifact size in bytes',
  labelNames: ['type']
});

export const jobEquityPoints = new client.Counter({
  name: 'job_equity_points_total',
  help: 'Total equity points generated',
  labelNames: ['type']
});
