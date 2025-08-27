import escapeHtml from 'escape-html';

export function htmlPage({ title, dataJson, generatedAt, params }) {
  const now = new Date(generatedAt || Date.now()).toISOString();
  const t = escapeHtml(title || 'Analytics Report');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${t}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="dns-prefetch" href="https://cdn.jsdelivr.net">
<style>
  :root{--bg:#0f141c;--fg:#e6edf3;--muted:#9aa0a6;--card:#141b24;--accent:#4cc9f0}
  html,body{margin:0;padding:0;background:var(--bg);color:var(--fg);font:14px/1.5 system-ui, -apple-system, Segoe UI, Roboto, Arial}
  .wrap{max-width:1100px;margin:0 auto;padding:20px}
  h1{font-size:20px;margin:0 0 12px}
  .row{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-start}
  .card{background:var(--card);border:1px solid #1d2532;border-radius:12px;padding:12px}
  .btn{background:#1c2430;border:1px solid #243042;border-radius:8px;color:#fff;padding:8px 10px;cursor:pointer}
  .muted{color:var(--muted)}
  table{width:100%;border-collapse:collapse}
  th,td{padding:8px;border-bottom:1px solid #1d2532;text-align:right}
  th:first-child,td:first-child{text-align:left}
  canvas{max-width:100%}
  .pill{display:inline-block;border:1px solid #2a3547;border-radius:999px;padding:2px 8px;font-size:12px;margin-right:6px}
  @media print{
    .noprint{display:none!important}
    .card{break-inside:avoid}
    body{background:#fff;color:#000}
  }
</style>
</head>
<body>
<div class="wrap">
  <header class="row">
    <div class="card" style="flex:1 1 auto">
      <h1>Analytics Report</h1>
      <div class="muted">Generated: ${now}</div>
      <div class="muted">Params: baseline=<b>${escapeHtml(params.baseline||'none')}</b>, align=<b>${escapeHtml(params.align||'none')}</b>, rebase=<b>${params.rebase??'-'}</b>, ds=<b>${escapeHtml(params.ds||'none')}</b> n=<b>${params.n||''}</b></div>
    </div>
    <div class="card noprint" style="display:flex;gap:8px;align-items:center">
      <button id="btn-zip" class="btn">Download ZIP</button>
      <button id="btn-copy" class="btn">Copy Link</button>
      <button onclick="window.print()" class="btn">Print / PDF</button>
    </div>
  </header>

  <section class="card">
    <canvas id="chart" height="360"></canvas>
  </section>

  <section class="card">
    <h2 style="margin:0 0 8px;font-size:16px">Stats</h2>
    <table id="stats"><thead>
      <tr><th>Series</th><th>From</th><th>To</th><th>Points</th><th>Return</th><th>MaxDD</th><th>ΔReturn vs Baseline</th><th>ΔMaxDD</th></tr>
    </thead><tbody></tbody></table>
  </section>

  <section class="card">
    <h2 style="margin:0 0 8px;font-size:16px">Notes</h2>
    <ul class="muted" style="margin:0 0 0 18px">
      <li>Chart is rendered client-side with Chart.js using the embedded JSON below.</li>
      <li>Use the Print/PDF button for a portable copy; or Download ZIP for CSV + JSON bundle.</li>
    </ul>
  </section>
</div>

<script id="report-data" type="application/json">${dataJson}</script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js" integrity="" crossorigin="anonymous"></script>
<script>
(function(){
  const el = document.getElementById('report-data');
  const data = JSON.parse(el.textContent || '{}');
  const ctx = document.getElementById('chart').getContext('2d');

  // Align + Rebase kaip Overlays v2
  function alignAndRebase(series, baseline, settings){
    const { align, rebase } = settings || {};
    const all = [...series, ...(baseline? [baseline] : [])];
    if (align === 'first-common') {
      const sets = all.map(s=> new Set(s.equity.map(p=>p.ts)));
      let firstCommon = null;
      const cand = [...sets[0]].sort((a,b)=>a-b);
      for (const t of cand) if (sets.every(S => S.has(t))) { firstCommon = t; break; }
      if (firstCommon!=null) all.forEach(s => { s.equity = s.equity.filter(p=> p.ts >= firstCommon); });
    }
    if (rebase) {
      all.forEach(s=>{
        if (!s.equity.length) return;
        const y0 = s.equity[0].equity;
        if (!y0) return;
        s.equity = s.equity.map(p=> ({ ts:p.ts, equity: (rebase * (p.equity / y0)) }));
      });
    }
    return { series, baseline };
  }

  function pct(v){ return v==null? '-' : (v*100).toFixed(2)+'%'; }
  function pp(v){ return v==null? '-' : (v*100).toFixed(2)+'pp'; }
  function statsOf(s){
    if (!s.equity?.length) return {ret:null,dd:null,from:null,to:null,n:0};
    const from = s.equity[0].ts, to = s.equity.at(-1).ts, n = s.equity.length;
    const ret = s.equity.at(-1).equity / s.equity[0].equity - 1;
    let peak=-Infinity, dd=0; s.equity.forEach(p=>{ peak=Math.max(peak,p.equity); dd=Math.min(dd,p.equity/peak-1); });
    return {ret,dd,from,to,n};
  }

  const settings = { align: data.params.align, rebase: data.params.rebase };
  const base = data.baseline || null;
  const series = data.items || [];
  const { series:aligned, baseline:alignedBase } = alignAndRebase(series.map(x=>({ ...x, equity:[...x.equity] })), base? { ...base, equity:[...base.equity] } : null, settings);

  // Chart
  const colors = ['#4cc9f0','#ffd166','#06d6a0','#ef476f','#118ab2','#f72585','#9b5de5','#5bc0eb','#c2f970','#ff9f1c'];
  function color(i){ return colors[i % colors.length]; }
  const datasets = [];
  if (alignedBase) datasets.push({
    label: 'Baseline (Live)',
    data: alignedBase.equity.map(p=>({x:p.ts,y:p.equity})),
    borderWidth:2, pointRadius:0
  });
  aligned.forEach((s,i)=>{
    datasets.push({
      label: s.label || (s.jobId? ('#'+s.jobId):'overlay'),
      data: s.equity.map(p=>({x:p.ts,y:p.equity})),
      borderDash:[6,4], borderWidth:2, pointRadius:0, borderColor: color(i + (alignedBase?1:0))
    });
  });
  const chart = new Chart(ctx, {
    type: 'line',
    data: { datasets },
    options: { parsing:false, animation:false, plugins:{ legend:{ position:'bottom' } }, scales:{ x:{ type:'timeseries' }, y:{ beginAtZero:false } } }
  });

  // Stats table
  const tbody = document.querySelector('#stats tbody');
  const b = alignedBase? statsOf(alignedBase) : null;
  function row(name, s){
    const st = statsOf(s);
    const dR = (b && st.ret!=null && b.ret!=null) ? (st.ret - b.ret) : null;
    const dD = (b && st.dd!=null && b.dd!=null) ? (st.dd - b.dd) : null;
    const fmtDate = ts => ts? (new Date(ts)).toISOString().slice(0,19).replace('T',' ') : '-';
    return '<tr><td>'+name+'</td><td>'+fmtDate(st.from)+'</td><td>'+fmtDate(st.to)+'</td><td>'+st.n+'</td><td>'+pct(st.ret)+'</td><td>'+pct(st.dd)+'</td><td>'+pp(dR)+'</td><td>'+pp(dD)+'</td></tr>';
  }
  const rows = [];
  if (alignedBase) rows.push(row('Baseline (Live)', alignedBase));
  aligned.forEach((s)=> rows.push(row(s.label || (s.jobId? ('#'+s.jobId):'overlay'), s)));
  tbody.innerHTML = rows.join('');

  // Buttons
  const qs = new URLSearchParams({
    job_ids: (data.jobIds || []).join(','),
    baseline: data.params.baseline || 'none',
    overlay_align: data.params.align || 'none',
    overlay_rebase: data.params.rebase ?? '',
    ds: data.params.ds || '',
    n: data.params.n || ''
  }).toString();
  const zipUrl = '/analytics/overlays/report?' + qs;
  document.getElementById('btn-zip').addEventListener('click', ()=> { window.open(zipUrl, '_blank', 'noopener'); });

  document.getElementById('btn-copy').addEventListener('click', async ()=>{
    try { await navigator.clipboard.writeText(location.href); alert('Link copied'); } catch { alert('Copy failed'); }
  });
})();
</script>
</body></html>`;
}

export default { htmlPage };
