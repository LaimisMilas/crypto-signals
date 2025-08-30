/* eslint-env browser */
export async function mount(root){
  const Chart = window.Chart || (await import('/assets/vendor/chart.umd.js')).default;

  let canvas = root.querySelector('canvas');
  if (!canvas){
    canvas = document.createElement('canvas');
    root.appendChild(canvas);
  }

  const chart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: { datasets: [{ label: 'Equity', data: [] }] },
    options: { parsing:false, animation:false, scales:{ x:{type:'time', time:{unit:'minute'}}, y:{} } }
  });

  const qs = new URLSearchParams(location.search).toString();
    const status = document.createElement('div');
    status.innerHTML = 'Connected <span id="equity-trace"></span>';
    root.prepend(status);

    function BadgeTrace(meta){
      if (!meta?.trace_id) return '';
      const url = (window.OTEL_VIEWER_URL ? `${window.OTEL_VIEWER_URL}${meta.trace_id}` : null);
      const t = meta.trace_id.slice(0,8);
      return `<span class="badge">trace:${t}${url?` <a target="_blank" rel="noopener" href="${url}">open</a>`:''} <button data-copy="${meta.trace_id}">copy</button></span>`;
    }

    document.addEventListener('click', e => {
      const btn = e.target.closest('button[data-copy]');
      if (btn){
        navigator.clipboard.writeText(btn.dataset.copy).then(()=>{
          window.Toast?.open({ title:'Copied', variant:'success' });
        });
      }
    });

    const es = new EventSource(`/live/equity-stream?${qs}`);
    const onMsg = (e)=>{
      const msg = JSON.parse(e.data);
      if (msg.meta) {
        const el = root.querySelector('#equity-trace');
        if (el) el.innerHTML = BadgeTrace(msg.meta);
      }
      if (msg.type === 'init') {
        chart.data.datasets[0].data = msg.equity.map(p=>({ x:p.ts, y:p.equity }));
        chart.update();
      } else if (msg.type === 'append') {
        chart.data.datasets[0].data.push({ x: msg.point.ts, y: msg.point.equity });
        chart.update('none');
      }
    };
    es.onmessage = onMsg;

  return {
    unmount(){
      try { es.close(); } catch { /* ignore */ }
      try { chart.destroy(); } catch { /* ignore */ }
    }
  };
}
