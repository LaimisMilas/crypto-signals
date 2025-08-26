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

  function applyOverlay(data){
    const ds = {
      label: 'Overlay',
      data: data.map(p=>({ x:p.ts, y:p.equity })),
      borderDash: [6,4],
      borderWidth: 2,
      pointRadius: 0
    };
    const i = chart.data.datasets.findIndex(d => d.label==='Overlay');
    if (i>=0) chart.data.datasets[i] = ds; else chart.data.datasets.push(ds);
    chart.update('none');
  }
  function clearOverlay(){
    chart.data.datasets = chart.data.datasets.filter(d => d.label!=='Overlay');
    chart.update('none');
  }

  const onOverlay = e => applyOverlay(e.detail.overlay);
  const onClear = () => clearOverlay();
  const onPeriod = () => {};
  window.addEventListener('analytics:overlay', onOverlay);
  window.addEventListener('analytics:overlay:clear', onClear);
  window.addEventListener('analytics:period:set', onPeriod);

  return {
    unmount(){
      try { chart.destroy(); } catch { /* ignore */ }
      window.removeEventListener('analytics:overlay', onOverlay);
      window.removeEventListener('analytics:overlay:clear', onClear);
      window.removeEventListener('analytics:period:set', onPeriod);
      root.innerHTML = '';
    }
  };
}
