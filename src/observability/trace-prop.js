import { context, trace } from '@opentelemetry/api';

export default function traceProp(req, res, next) {
  const span = trace.getSpan(context.active());
  const sc = span?.spanContext?.();
  req.trace = {
    trace_id: sc?.traceId || null,
    span_id: sc?.spanId || null,
    req_id: req.id || req.headers['x-request-id'] || null,
  };
  if (req.trace.trace_id) res.setHeader('X-Trace-Id', req.trace.trace_id);
  if (req.trace.req_id) res.setHeader('X-Request-Id', req.trace.req_id);
  next();
}
