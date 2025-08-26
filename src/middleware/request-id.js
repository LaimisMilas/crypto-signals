import { randomUUID } from 'crypto';

export function requestIdMiddleware(req, res, next) {
  const incomingReqId = req.headers['x-request-id'];
  const reqId = incomingReqId || randomUUID();
  res.setHeader('x-request-id', reqId);
  const incomingTraceparent = req.headers['traceparent'];
  if (incomingTraceparent) {
    res.setHeader('traceparent', incomingTraceparent);
    req.traceparent = incomingTraceparent;
  }
  req.reqId = reqId;
  next();
}
