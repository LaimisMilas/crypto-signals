import pino from 'pino';
import { context, trace } from '@opentelemetry/api';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
  messageKey: 'msg',
  mixin() {
    const span = trace.getSpan(context.active());
    const spanCtx = span?.spanContext?.();
    return spanCtx ? {
      traceId: spanCtx.traceId,
      spanId: spanCtx.spanId
    } : {};
  }
});

export default logger;
