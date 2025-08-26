import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import otelResources from '@opentelemetry/resources';
import { SemanticResourceAttributes as S } from '@opentelemetry/semantic-conventions';
import { readFileSync } from 'fs';

const pkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url))
);

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
    resource: resourceFromAttributes({
      [S.SERVICE_NAME]: pkg.name || 'crypto-signals-api',
      [S.SERVICE_VERSION]: pkg.version,
      [S.SERVICE_NAMESPACE]:
        process.env.SERVICE_NAMESPACE || 'crypto-signals',
      [S.DEPLOYMENT_ENVIRONMENT]:
        process.env.DEPLOY_ENV || 'development'
    }),
    traceExporter,
    metricReader: new PeriodicExportingMetricReader({ exporter: metricExporter })
  });
  await sdk.start();
  return sdk;
}
