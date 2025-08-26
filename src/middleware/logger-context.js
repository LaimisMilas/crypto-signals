import logger from '../logger.js';

export function loggerContext(req, _res, next) {
  req.log = logger.child({ reqId: req.reqId, method: req.method, path: req.path });
  next();
}
