import logger from '../observability/logger.js';

export function loggerContextMiddleware(req, res, next) {
  req.log = logger.child({ reqId: req.reqId, path: req.path, method: req.method });
  next();
}
