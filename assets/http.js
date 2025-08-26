import CorrelationBar from './obs/correlation-bar.js';
import { showErrorToast } from './obs/error-toasts.js';

export async function http(url, { method = 'GET', headers = {}, body } = {}) {
  const start = performance.now();
  const h = { ...headers };
  if (!h['x-request-id']) {
    h['x-request-id'] = (self.crypto?.randomUUID?.() || Math.random().toString(36).slice(2));
  }
  let res;
  try {
    res = await fetch(url, { method, headers: h, body });
  } catch (e) {
    const errMeta = { message: `Network error ${method} ${url}`, code: 'NETWORK_ERROR' };
    CorrelationBar?.pushError(errMeta);
    showErrorToast(errMeta);
    throw e;
  }
  const duration = performance.now() - start;

  const reqId = res.headers.get('x-request-id');
  const traceparent = res.headers.get('traceparent');
  const traceId = parseTrace(traceparent);

  if (!res.ok) {
    const msg = `HTTP ${res.status} ${method} ${url}`;
    const errMeta = { message: msg, reqId, code: 'HTTP_ERROR', httpStatus: res.status, traceId };
    CorrelationBar?.pushError(errMeta);
    showErrorToast(errMeta);
    throw new Error(msg);
  }

  CorrelationBar?.pushEvent({ type: 'http', reqId, traceId, ts: Date.now() });
  return res;
}

function parseTrace(tp) {
  return tp?.split('-')?.[1];
}
