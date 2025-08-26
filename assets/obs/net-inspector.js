export function initNetInspector() {
  const params = new URLSearchParams(location.search);
  const dev = params.get('debug') === '1' || process.env.NODE_ENV === 'development';
  if (!dev) return;
  const panel = document.createElement('div');
  panel.style.position = 'fixed';
  panel.style.bottom = '0';
  panel.style.left = '0';
  panel.style.right = '0';
  panel.style.maxHeight = '200px';
  panel.style.overflow = 'auto';
  panel.style.background = 'rgba(0,0,0,0.9)';
  panel.style.color = '#0f0';
  panel.style.fontSize = '12px';
  panel.style.display = 'none';
  panel.style.zIndex = '9999';
  document.body.appendChild(panel);

  let reqs = [];
  function render() {
    panel.innerHTML = reqs.map(r => `<div>[${r.method}] ${r.url} ${r.status} ${r.duration.toFixed(0)}ms reqId=${r.reqId || ''} traceId=${r.traceId || ''} <button data-curl="${r.curl}">copy</button></div>`).join('');
    panel.querySelectorAll('button').forEach(b => b.onclick = () => navigator.clipboard?.writeText(b.dataset.curl));
  }

  const origFetch = window.fetch;
  window.fetch = async (input, init = {}) => {
    const method = init.method || 'GET';
    const start = performance.now();
    const res = await origFetch(input, init);
    const duration = performance.now() - start;
    const reqId = res.headers.get('x-request-id');
    const traceparent = res.headers.get('traceparent');
    const traceId = traceparent?.split('-')[1];
    const curl = `curl -X ${method} '${input}'${reqId ? ` -H 'x-request-id: ${reqId}'` : ''}`;
    reqs.push({ method, url: input, status: res.status, duration, reqId, traceId, curl });
    if (reqs.length > 10) reqs.shift();
    render();
    return res;
  };

  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === '`') {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }
  });
}
