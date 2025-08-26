export function errorHandler(err, req, res, _next) {
  res.setHeader('x-request-id', req.reqId);
  const status = err.status || 500;
  res.status(status).json({ reqId: req.reqId, error: err.message || 'Internal Server Error' });
}
