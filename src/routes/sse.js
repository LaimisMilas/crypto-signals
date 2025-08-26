import crypto from 'crypto';
import { Router } from 'express';
import { sseConnections, sseEventsSent } from '../observability/metrics.js';

export const sseRouter = Router();

const clients = new Set();

sseRouter.get('/events', (req, res) => {
  const clientId = req.headers['x-client-id'] || crypto.randomUUID();
  const reqId = req.reqId;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('x-request-id', reqId);

  res.write(`event: hello\n`);
  res.write(`id: ${Date.now()}\n`);
  res.write(`data: ${JSON.stringify({ clientId, reqId })}\n\n`);
  sseEventsSent.inc({ event: 'hello' });

  const client = { res, clientId, connectedAt: Date.now(), reqId };
  clients.add(client);
  sseConnections.inc();
  req.log?.info({ clientId }, 'SSE client connected');

  const ping = setInterval(() => {
    res.write(`event: ping\n`);
    res.write(`data: ${JSON.stringify({ ts: Date.now(), reqId })}\n\n`);
    sseEventsSent.inc({ event: 'ping' });
  }, 15000);

  req.on('close', () => {
    clearInterval(ping);
    clients.delete(client);
    sseConnections.dec();
  });
});

export function sseBroadcast(event, payload, { traceId, spanId, reqId } = {}) {
  for (const c of clients) {
    c.res.write(`event: ${event}\n`);
    c.res.write(`id: ${Date.now()}\n`);
    c.res.write(`data: ${JSON.stringify({ ...payload, traceId, spanId, reqId: reqId || c.reqId })}\n\n`);
    sseEventsSent.inc({ event });
  }
}
