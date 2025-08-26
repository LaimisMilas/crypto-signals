import pinoHttp from 'pino-http';
import { trace } from '@opentelemetry/api';
import logger from './logger.js';

export default pinoHttp({
  logger,
  genReqId: req => req.reqId,
  customAttributeKeys: {
    req: 'http',
    res: 'res',
    responseTime: 'dur_ms'
  },
  serializers: {
    req (req) {
      return {
        method: req.method,
        path: req.url,
        headers: {
          'user-agent': req.headers['user-agent']
        }
      };
    },
    res (res) {
      return { status: res.statusCode };
    }
  },
    customLogLevel: (res, err) => err ? 'error' : (res.statusCode >= 500 ? 'error' : (res.statusCode >= 400 ? 'warn' : 'info')),
    customSuccessMessage: () => 'req',
    customErrorMessage: () => 'req_error',
    customProps: (req, res) => {
      const span = trace.getActiveSpan();
      const ctx = span ? span.spanContext() : undefined;
      return {
        reqId: req.reqId,
        method: req.method,
        path: req.url,
        status: res.statusCode,
        ua: req.headers['user-agent'],
        ip: req.ip,
        trace_id: ctx?.traceId,
        span_id: ctx?.spanId
      };
    }
  });
