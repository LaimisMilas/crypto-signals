import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import otelResources from '@opentelemetry/resources';
import { SemanticResourceAttributes as S } from '@opentelemetry/semantic-conventions';

let sdk;

export async function startOtel() {
  if (sdk) return sdk;
  const traceExporter = new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || undefined
  });
  const metricExporter = new OTLPMetricExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT
      ? process.env.OTEL_EXPORTER_OTLP_ENDPOINT.replace('/v1/traces', '/v1/metrics')
      : undefined
  });
    const { resourceFromAttributes } = otelResources;
    sdk = new NodeSDK({
      resource: resourceFromAttributes({ [S.SERVICE_NAME]: 'crypto-signals-api' }),
    traceExporter,
    metricReader: new PeriodicExportingMetricReader({ exporter: metricExporter })
  });
  await sdk.start();
  return sdk;
}
