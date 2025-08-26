import pino from 'pino';
import { context, trace } from '@opentelemetry/api';

const logger = pino({
  mixin() {
    const span = trace.getSpan(context.active());
    if (span) {
      const spanCtx = span.spanContext();
      return { traceId: spanCtx.traceId, spanId: spanCtx.spanId };
    }
    return {};
  }
});

export default logger;
