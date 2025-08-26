import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import otelResources from '@opentelemetry/resources';
import { SemanticResourceAttributes as S } from '@opentelemetry/semantic-conventions';
import { ParentBasedSampler, TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';
import pkg from '../../package.json' with { type: 'json' };

const { resourceFromAttributes } = otelResources;

let sdk;
if (process.env.OBSERVABILITY_ENABLED === 'true') {
    const resource = resourceFromAttributes({
      [S.SERVICE_NAME]: 'crypto-signals',
      [S.SERVICE_VERSION]: pkg.version
    });

  sdk = new NodeSDK({
    resource,
    traceExporter: new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
      headers: process.env.OTEL_EXPORTER_OTLP_HEADERS ? JSON.parse(process.env.OTEL_EXPORTER_OTLP_HEADERS) : {}
    }),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT
          ? process.env.OTEL_EXPORTER_OTLP_ENDPOINT.replace('/v1/traces', '/v1/metrics')
          : 'http://localhost:4318/v1/metrics'
      }),
      exportIntervalMillis: 60000
    }),
    traceSampler: new ParentBasedSampler({
      root: new TraceIdRatioBasedSampler(Number(process.env.OTEL_SAMPLER_RATIO ?? 1))
    }),
    instrumentations: [getNodeAutoInstrumentations()]
  });
  sdk.start().catch(err => console.error('OTel start failed', err));
}

export { sdk };
