# SLO / SLI

## Service Level Indicators

* **API availability** – error ratio over total requests
  ```
  sli:api_error_ratio = sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))
  availability = 1 - sli:api_error_ratio
  ```
* **API latency** – proportion of requests served under 1s
  ```
  sli:api_latency_under_1s_ratio = sum(rate(http_request_duration_seconds_bucket{le="1"}[5m])) / sum(rate(http_request_duration_seconds_count[5m]))
  ```
* **SSE availability** – ratio of delivered ping events vs expected
  ```
  sli:sse_ping_delivery_ratio = clamp_max(
    rate(sse_events_sent_total{event="ping"}[5m]) /
    (avg_over_time(sse_connections[5m]) / 15)
  , 1)
  ```
* **Jobs success** – share of jobs finishing without error
  ```
  sli:jobs_success_ratio = 1 - ( sum(rate(job_duration_seconds_count{status="err"}[15m])) / sum(rate(job_duration_seconds_count[15m])) )
  ```

## SLO targets

| SLO | Target |
| --- | --- |
| API availability | 99.5% |
| API latency p95 | < 1.0s |
| SSE availability | ≥ 98% |
| Jobs success rate | 99% |

## Burn rate

Error budget `budget = 1 - SLO`. Burn rate compares current error ratio to the budget:

```
burn = error_ratio / budget
```

High burn (>14) indicates fast degradation (page); moderate burn (>6) indicates slow burn (ticket).

## Runbook

1. **API availability** – check HTTP error logs and traces. Investigate recent deploys or upstream outages.
2. **API latency** – inspect slow traces (p95>1s). Look for database or external service slowness.
3. **SSE availability** – verify SSE connections and ping loop. Check collector logs if pings are delayed.
4. **Jobs success** – inspect job logs for failures (backtests, optimizations, walk-forward).

Use logs, traces and pipeline health dashboards to drill into failures and correlate with deploys or incidents.
