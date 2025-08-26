window.debugOverlayEvents = [];

(function(){
  const es = new EventSource('/events');

  function record(evt){
    try {
      const data = JSON.parse(evt.data);
      if (data.jobId) {
        console.debug(`overlay/trade from job #${data.jobId} (trace:${data.traceId})`);
      }
      window.debugOverlayEvents.unshift({
        ts: Date.now(),
        reqId: data.reqId,
        traceId: data.traceId,
        jobId: data.jobId
      });
      window.debugOverlayEvents = window.debugOverlayEvents.slice(0,5);
      render();
    } catch(e) {
      console.error('debug overlay parse error', e);
    }
  }

  es.addEventListener('overlay', record);
  es.addEventListener('trade', record);

  function render(){
    const el = document.getElementById('debug-overlay');
    if (!el) return;
    el.innerHTML = window.debugOverlayEvents.map(ev =>
      `<div title="equity/trades from job #${ev.jobId} (trace:${ev.traceId})">${new Date(ev.ts).toISOString()} req:${ev.reqId} job:${ev.jobId} trace:${ev.traceId}</div>`
    ).join('');
  }

  const panel = document.createElement('div');
  panel.id = 'debug-overlay';
  panel.style.position = 'fixed';
  panel.style.bottom = '40px';
  panel.style.right = '10px';
  panel.style.background = 'rgba(0,0,0,0.7)';
  panel.style.color = '#fff';
  panel.style.fontSize = '12px';
  panel.style.padding = '4px';
  panel.style.maxWidth = '260px';
  panel.style.display = 'none';
  document.body.appendChild(panel);

  const isDev = (window.NODE_ENV === 'development');
  if (isDev) {
    const btn = document.createElement('button');
    btn.textContent = 'toggle debug';
    btn.style.position = 'fixed';
    btn.style.bottom = '10px';
    btn.style.right = '10px';
    btn.addEventListener('click', () => {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });
    document.body.appendChild(btn);
  }
})();
