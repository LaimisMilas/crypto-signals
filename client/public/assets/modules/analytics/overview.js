/* eslint-env browser */
export async function mount(root){
  const Chart = window.Chart || (await import('/assets/vendor/chart.umd.js')).default;
  root.innerHTML = '';
  const btn = document.createElement('button');
  btn.textContent = 'Export PNG';
  btn.className = 'btn';
  btn.style.marginBottom = '8px';
  root.appendChild(btn);
  const canvas = document.createElement('canvas');
  root.appendChild(canvas);
  const chart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: { datasets: [] },
    options: { responsive: true }
  });
  const COLORS = ['#4cc9f0','#ffd166','#06d6a0','#ef476f','#118ab2'];
  const colorOf = (jobId) => COLORS[jobId % COLORS.length];

  function alignAndRebase(series, baseline, settings){
    const { align, rebase } = settings || {};
    const all = [...series, ...(baseline ? [baseline] : [])];
    if (align === 'first-common'){
      const sets = all.map(s => new Set(s.equity.map(p => p.ts)));
      let firstCommon = null;
      const candidates = [...sets[0]].sort((a,b)=>a-b);
      for (const t of candidates){ if (sets.every(S => S.has(t))){ firstCommon = t; break; } }
      if (firstCommon != null){
        all.forEach(s => { s.equity = s.equity.filter(p => p.ts >= firstCommon); });
      }
    }
    if (rebase){
      all.forEach(s => {
        if (!s.equity.length) return;
        const y0 = s.equity[0].equity;
        if (!y0) return;
        s.equity = s.equity.map(p => ({ ts:p.ts, equity: (rebase * (p.equity / y0)) }));
      });
    }
    return { series, baseline };
  }

  function render(detail){
    const { items = [], baseline = null, settings = {} } = detail;
    const itemsCopy = items.map(it => ({ ...it, equity: [...it.equity] }));
    const baseCopy = baseline ? { ...baseline, equity: [...baseline.equity] } : null;
    const { series, baseline: base } = alignAndRebase(itemsCopy, baseCopy, settings);
    chart.data.datasets = [];
    if (base){
      chart.data.datasets.push({
        label: 'Baseline (Live)',
        data: base.equity.map(p => ({ x:p.ts, y:p.equity })),
        borderWidth: 2,
        pointRadius: 0,
        borderColor: '#ffffff',
        meta: { type: 'baseline' }
      });
    }
    for (const it of series){
      chart.data.datasets.push({
        label: `Overlay ${it.jobId}`,
        data: it.equity.map(p => ({ x:p.ts, y:p.equity })),
        borderDash: [6,4],
        borderWidth: 2,
        pointRadius: 0,
        borderColor: colorOf(it.jobId),
        meta: { type:'overlay', jobId: it.jobId }
      });
    }
    chart.update('none');
  }

  const onOverlays = e => render(e.detail);
  const onClear = () => {
    chart.data.datasets = chart.data.datasets.filter(d => !d.meta || (d.meta.type !== 'overlay' && d.meta.type !== 'baseline'));
    chart.update('none');
  };
  window.addEventListener('analytics:overlays:v2', onOverlays);
  window.addEventListener('analytics:overlay:clear', onClear);

  btn.addEventListener('click', () => {
    const url = chart.toBase64Image();
    const w = window.open();
    if (w){
      const img = new Image();
      img.src = url;
      w.document.body.appendChild(img);
    }
  });

  return {
    unmount(){
      try { chart.destroy(); } catch { /* ignore */ }
      window.removeEventListener('analytics:overlays:v2', onOverlays);
      window.removeEventListener('analytics:overlay:clear', onClear);
      root.innerHTML = '';
    }
  };
}
