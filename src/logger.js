import pino from 'pino';
import { context, trace } from '@opentelemetry/api';
import { mkdirSync } from 'fs';

mkdirSync('./logs', { recursive: true });

const logger = pino(
  {
    redact: ['userEmail', 'token', 'authorization', 'cookie', 'sessionId'],
    mixin() {
      const span = trace.getSpan(context.active());
      if (span) {
        const spanCtx = span.spanContext();
        return { traceId: spanCtx.traceId, spanId: spanCtx.spanId };
      }
      return {};
    }
  },
  pino.destination({ dest: './logs/app.jsonl', mkdir: true })
);

export default logger;
