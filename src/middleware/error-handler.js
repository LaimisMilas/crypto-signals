export function errorHandler(err, req, res, next) {
  req?.log?.error({ err }, 'Unhandled error');
  res.setHeader('x-request-id', req.reqId || '');
  res.status(err.status || 500).json({
    error: err.message || 'Internal error',
    reqId: req.reqId
  });
}
