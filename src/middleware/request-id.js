import crypto from 'crypto';
import { context, trace } from '@opentelemetry/api';

export function requestId(req, res, next) {
  const reqId = req.headers['x-request-id'] || crypto.randomUUID();
  req.reqId = reqId;
  res.setHeader('x-request-id', reqId);

  let traceparent = req.headers['traceparent'];
  if (!traceparent) {
    const span = trace.getSpan(context.active());
    if (span) {
      const sctx = span.spanContext();
      traceparent = `00-${sctx.traceId}-${sctx.spanId}-01`;
    }
  }
  if (traceparent) {
    req.traceparent = traceparent;
    res.setHeader('traceparent', traceparent);
  }
  next();
}
