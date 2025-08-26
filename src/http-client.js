export async function callService(url, { headers = {}, ...init } = {}, reqCtx = {}) {
  const h = {
    ...headers,
    'x-request-id': reqCtx.reqId,
    ...(reqCtx.traceparent ? { traceparent: reqCtx.traceparent } : {})
  };
  return fetch(url, { ...init, headers: h });
}
