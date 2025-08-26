import crypto from 'crypto';
import { context, trace } from '@opentelemetry/api';
import { sseConnections, sseEventsSent } from '../observability/metrics.js';

const clients = new Set();

export function sseRoutes(app) {
  app.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders && res.flushHeaders();

    const clientId = req.headers['x-client-id'] || crypto.randomUUID();
    const client = { res, reqId: req.reqId };
    clients.add(client);
    sseConnections.inc();

    res.write(`event: hello\ndata:${JSON.stringify({ clientId, reqId: req.reqId })}\n\n`);
    sseEventsSent.inc({ event: 'hello' });

    const ping = setInterval(() => {
      res.write(`event: ping\ndata:${JSON.stringify({ ts: Date.now(), reqId: req.reqId })}\n\n`);
      sseEventsSent.inc({ event: 'ping' });
    }, 15000);

    req.on('close', () => {
      clearInterval(ping);
      clients.delete(client);
      sseConnections.dec();
    });
  });
}

export function getActiveTraceMeta() {
  const span = trace.getSpan(context.active());
  if (!span) return {};
  const sctx = span.spanContext();
  return { traceId: sctx.traceId, spanId: sctx.spanId };
}

export function sseBroadcast(event, payload, meta = {}) {
  for (const client of clients) {
    const data = { ...payload, ...meta, reqId: client.reqId };
    client.res.write(`event: ${event}\ndata:${JSON.stringify(data)}\n\n`);
    sseEventsSent.inc({ event });
  }
}
