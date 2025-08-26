# Observability Pipelines

This project uses the OpenTelemetry Collector to route traces, metrics and logs
to backends such as Prometheus, Loki and external APM services.

## Docker Compose

```bash
cp deploy/otel/env.example deploy/otel/.env
cd deploy
docker compose -f docker-compose.observability.yml up
```

The stack will start the API, OpenTelemetry Collector, Loki, Prometheus and
Grafana. Application logs are written to `../logs` and ingested by the Collector
via the `filelog` receiver.

## Kubernetes

Kubernetes manifests are available under `k8s/`. Apply the collector, API and
(optional) Loki manifests:

```bash
kubectl apply -f k8s/otel-collector.yaml
kubectl apply -f k8s/api.yaml
# kubectl apply -f k8s/loki.yaml
```

Set the environment variables in the manifests or via ConfigMaps/Secrets to
point at your backends.

## Sampling

Sampling is controlled via environment variables in `deploy/otel/env.example`.
Change `TRACE_SAMPLING_DEFAULT`, `TRACE_SAMPLING_ERROR` and
`TRACE_SAMPLING_IMPORTANT` to adjust tail sampling without redeploying.

## Troubleshooting

A Grafana dashboard "Pipeline Health" should be created to monitor exporter
failures, receiver refusals and sampling ratios. Prometheus alert rules in
`deploy/prometheus/alerts.yml` fire when the collector drops data.

Collector logs and metrics are the first place to look when data is missing.
