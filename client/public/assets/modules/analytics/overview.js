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
  window.AnalyticsChart = chart;
  const COLORS = ['#4cc9f0','#ffd166','#06d6a0','#ef476f','#118ab2'];
  const colorOf = (jobId) => COLORS[jobId % COLORS.length];
  let originalBaseline = null;
  let currentSettings = { align:'none', rebase:null };

  function labelWithDelta(name, s, base){
    if (!base) return name;
    const ret = s.equity.at(-1).equity / s.equity[0].equity - 1;
    const bret = base.equity.at(-1).equity / base.equity[0].equity - 1;
    let peak=-Infinity, dd=0; s.equity.forEach(p=>{ peak=Math.max(peak,p.equity); dd=Math.min(dd, p.equity/peak-1); });
    let bpk=-Infinity, bdd=0; base.equity.forEach(p=>{ bpk=Math.max(bpk,p.equity); bdd=Math.min(bdd, p.equity/bpk-1); });
    const dR = (ret - bret)*100, dD = (dd - bdd)*100;
    return `${name} (ΔR ${dR.toFixed(1)}pp / ΔDD ${dD.toFixed(1)}pp)`;
  }

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
    originalBaseline = baseline ? { ...baseline, equity: [...baseline.equity] } : null;
    currentSettings = { align: settings.align || 'none', rebase: settings.rebase || null };
    const itemsCopy = items.map(it => ({ ...it, equity: [...it.equity] }));
    const baseCopy = originalBaseline ? { ...originalBaseline, equity: [...originalBaseline.equity] } : null;
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
        label: labelWithDelta(it.label || `Overlay ${it.jobId}`, it, base),
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
  const onInline = e => {
    const { items = [] } = e.detail || {};
    const itemsCopy = items.map(it => ({ ...it, equity: [...it.equity] }));
    const baseCopy = originalBaseline ? { ...originalBaseline, equity: [...originalBaseline.equity] } : null;
    const { series, baseline: base } = alignAndRebase(itemsCopy, baseCopy, currentSettings);
    const offset = chart.data.datasets.length;
    series.forEach((it, idx) => {
      chart.data.datasets.push({
        label: labelWithDelta(it.label || `Inline ${idx+1}`, it, base),
        data: it.equity.map(p => ({ x:p.ts, y:p.equity })),
        borderDash: [2,3],
        borderWidth: 2,
        pointRadius: 0,
        borderColor: COLORS[(offset + idx) % COLORS.length],
        meta: { type:'inline' }
      });
    });
    chart.update('none');
  };
  const onClear = () => {
    chart.data.datasets = chart.data.datasets.filter(d => !d.meta || (d.meta.type !== 'overlay' && d.meta.type !== 'baseline' && d.meta.type !== 'inline'));
    chart.update('none');
  };
  window.addEventListener('analytics:overlays:v2', onOverlays);
  window.addEventListener('analytics:overlays:inline', onInline);
  window.addEventListener('analytics:overlay:clear', onClear);

  btn.addEventListener('click', () => {
    const url = chart.toBase64Image();
    const a = document.createElement('a');
    a.href = url;
    a.download = 'analytics-overlays.png';
    a.click();
  });

  return {
    unmount(){
      try { chart.destroy(); } catch { /* ignore */ }
      window.removeEventListener('analytics:overlays:v2', onOverlays);
      window.removeEventListener('analytics:overlays:inline', onInline);
      window.removeEventListener('analytics:overlay:clear', onClear);
      root.innerHTML = '';
    }
  };
}
