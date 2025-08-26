export async function callService(url, init = {}, reqCtx = {}) {
  const headers = new Headers(init.headers || {});
  if (reqCtx.reqId) headers.set('x-request-id', reqCtx.reqId);
  if (reqCtx.traceparent) headers.set('traceparent', reqCtx.traceparent);
  const res = await fetch(url, { ...init, headers });
  return res;
}
