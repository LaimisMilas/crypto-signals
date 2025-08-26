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

## How to reproduce
```
curl -i http://localhost:3000/api/ping -H "x-request-id: test-123"
curl -N http://localhost:3000/events -H "x-client-id: dev-1"
curl -s http://localhost:3000/metrics | grep http_requests_total
```
