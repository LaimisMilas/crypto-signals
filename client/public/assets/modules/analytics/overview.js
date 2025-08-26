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
    data: { datasets: [{ label: 'Equity', data: [], borderWidth:2, pointRadius:0 }] },
    options: { responsive: true }
  });
  const COLORS = ['#4cc9f0','#ffd166','#06d6a0','#ef476f','#118ab2'];
  const colorOf = (jobId) => COLORS[jobId % COLORS.length];

  function applyMultiOverlays(items){
    chart.data.datasets = chart.data.datasets.filter(d => !d.meta || d.meta.type !== 'overlay');
    for (const it of items){
      chart.data.datasets.push({
        label: `Overlay ${it.jobId}`,
        data: it.equity.map(p => ({ x:p.ts, y:p.equity })),
        borderDash: [6,4],
        borderWidth: 2,
        pointRadius: 0,
        borderColor: colorOf(it.jobId),
        meta:{ type:'overlay', jobId: it.jobId }
      });
    }
    chart.update('none');
  }

  const onOverlays = e => applyMultiOverlays(e.detail.items);
  const onClear = () => {
    chart.data.datasets = chart.data.datasets.filter(d => !d.meta || d.meta.type !== 'overlay');
    chart.update('none');
  };
  const onPeriod = () => {};
  window.addEventListener('analytics:overlays', onOverlays);
  window.addEventListener('analytics:overlay:clear', onClear);
  window.addEventListener('analytics:period:set', onPeriod);

  return {
    unmount(){
      try { chart.destroy(); } catch { /* ignore */ }
      window.removeEventListener('analytics:overlays', onOverlays);
      window.removeEventListener('analytics:overlay:clear', onClear);
      window.removeEventListener('analytics:period:set', onPeriod);
      root.innerHTML = '';
    }
  };
}
