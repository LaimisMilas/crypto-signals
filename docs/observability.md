# Observability

## How to correlate
1. Each request returns `x-request-id` header. Logs include `reqId`, `traceId`, `spanId`.
2. Use these values to jump between logs and traces.

## Grafana panels
- **p95 latency** – request duration 95th percentile.
- **5xx rate** – proportion of server errors.
- **SSE connections** – current clients.
- **SSE events** – events sent by type.
- **Job duration** – histogram of background job durations.

## Jobs observability

Background runners expose domain metrics:

- `job_duration_seconds{type,status}` – duration per job type and final status.
- `job_artifacts_size_bytes{type}` – size of the last artifact produced by a job.
- `job_equity_points_total{type}` – count of normalized equity points.

Grafana "Jobs" block visualizes:

- Heatmap of `job_duration_seconds_bucket` by type.
- Graph of `job_artifacts_size_bytes` by type.
- Graph of `rate(job_equity_points_total[5m])` by type.

If the `JobOverlayEmpty` alert fires, overlay generation is stuck.
Use the provided `traceId` and `jobId` in logs to troubleshoot.

## How to reproduce
```
curl -i http://localhost:3000/api/ping -H "x-request-id: test-123"
curl -N http://localhost:3000/events -H "x-client-id: dev-1"
curl -s http://localhost:3000/metrics | grep http_requests_total
```
