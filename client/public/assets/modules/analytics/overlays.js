// assets/modules/analytics/overlays.js
/* eslint-env browser */
/* global Toast */
export async function mount(root){
  root.innerHTML = `
    <div style="display:flex;gap:8px;align-items:end;flex-wrap:wrap">
      <div><label>Type<br><select id="ov-type"><option value="">Any</option><option>backtest</option><option>optimize</option><option>walkforward</option></select></label></div>
      <div><label>Symbol<br><input id="ov-symbol" placeholder="e.g. BTCUSDT"></label></div>
      <div><label>Strategy<br><input id="ov-strategy" placeholder="e.g. ema"></label></div>
      <button id="ov-load" class="btn">Load jobs</button>
      <button id="ov-apply" class="btn">Apply overlays</button>
      <button id="ov-clear" class="btn">Clear all</button>
      <button id="ov-export" class="btn">Export CSV</button>
    </div>
    <div id="ov-jobs" style="margin-top:12px"></div>
    <div id="ov-stats" style="margin-top:12px"></div>
  `;

  const el = id => root.querySelector(id);
  const input = { type: el('#ov-type'), symbol: el('#ov-symbol'), strategy: el('#ov-strategy') };
  const btn = { load: el('#ov-load'), apply: el('#ov-apply'), clear: el('#ov-clear'), export: el('#ov-export') };
  const box = { jobs: el('#ov-jobs'), stats: el('#ov-stats') };

  const COLORS = ['#4cc9f0','#ffd166','#06d6a0','#ef476f','#118ab2'];
  const colorOf = (jobId) => COLORS[jobId % COLORS.length];

  const selectedJobs = new Map();
  let jobs = [];

  async function loadJobs(){
    const q = new URLSearchParams();
    if (input.type.value) q.set('type', input.type.value);
    if (input.symbol.value) q.set('symbol', input.symbol.value.toUpperCase());
    if (input.strategy.value) q.set('strategy', input.strategy.value);
    try{
      const res = await fetch(`/analytics/jobs?${q.toString()}`);
      const json = await res.json();
      jobs = json.jobs || [];
      renderJobs();
      Toast.open({ title:'Jobs loaded', variant:'success' });
    }catch(e){
      Toast.open({ title:'Failed to load jobs', description:e.message, variant:'error' });
    }
  }

  function renderJobs(){
    box.jobs.innerHTML = jobs.length ? jobs.map(j => {
      const p = j.params || {};
      const r = j.result || {};
      const checked = selectedJobs.has(j.id) ? 'checked' : '';
      return `<div class="card" style="padding:10px;border:1px solid #222;border-radius:10px;margin-bottom:6px;">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
          <input type="checkbox" data-id="${j.id}" ${checked}>
          <span style="width:12px;height:12px;background:${colorOf(j.id)};display:inline-block;border-radius:2px"></span>
          <span><b>#${j.id}</b> • ${j.type} • ${new Date(j.finished_at||j.created_at).toLocaleString()}</span>
        </label>
        <div style="font-size:13px;color:#9aa0a6">symbol=${p.symbol||'-'} strategy=${p.strategyId||'-'}</div>
        <div style="font-size:13px">return=${(r.return ?? r.cagr ?? '').toString()} PF=${r.profitFactor ?? ''}</div>
      </div>`;
    }).join('') : '<div style="opacity:.7">No jobs</div>';

    box.jobs.querySelectorAll('input[type=checkbox][data-id]').forEach(chk => {
      chk.addEventListener('change', () => {
        const id = Number(chk.dataset.id);
        if (chk.checked){
          if (selectedJobs.size >= 5){
            chk.checked = false;
            Toast.open({ title:'Max 5 overlays', variant:'warning' });
            return;
          }
          const job = jobs.find(x=>x.id===id);
          selectedJobs.set(id, job);
        }else{
          selectedJobs.delete(id);
        }
      });
    });
  }

  function renderStats(stats){
    if (!stats || !selectedJobs.size){ box.stats.innerHTML=''; return; }
    const ids = Array.from(selectedJobs.keys());
    const baselineId = ids[0];
    const base = stats[baselineId] || { return:0, maxDD:0 };
    const fmtPct = v => (v==null? '-': (v*100).toFixed(2)+'%');
    const rows = ids.map(id => {
      const j = selectedJobs.get(id) || {};
      const s = stats[id] || {};
      const pf = j.result?.profitFactor;
      return `<tr>
        <td><span style="display:inline-block;width:10px;height:10px;background:${colorOf(id)};margin-right:4px"></span>#${id}</td>
        <td>${j.type||''}</td>
        <td>${j.params?.symbol||'-'}</td>
        <td>${fmtPct(s.return)}</td>
        <td>${fmtPct(s.return - base.return)}</td>
        <td>${fmtPct(s.maxDD)}</td>
        <td>${fmtPct(s.maxDD - base.maxDD)}</td>
        <td>${pf ?? '-'}</td>
      </tr>`;
    }).join('');
    box.stats.innerHTML = `<table class="table"><thead><tr><th>Job</th><th>Type</th><th>Symbol</th><th>Return</th><th>ΔReturn</th><th>MaxDD</th><th>ΔMaxDD</th><th>PF</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  async function applyOverlays(){
    const ids = Array.from(selectedJobs.keys());
    if (!ids.length){ Toast.open({ title:'Select jobs first', variant:'warning' }); return; }
    try{
      const res = await fetch(`/analytics?overlay_job_ids=${ids.join(',')}`);
      const json = await res.json();
      const items = json.overlayEquities || [];
      const stats = json.overlayStatsByJobId || {};
      const missing = ids.filter(id => !items.find(it => it.jobId === id));
      if (items.length){
        window.dispatchEvent(new CustomEvent('analytics:overlays', { detail:{ items, stats } }));
        renderStats(stats);
        Toast.open({ title:'Overlays applied', variant:'success' });
      }
      if (missing.length){
        Toast.open({ title:`No equity for jobs: ${missing.join(', ')}`, variant:'warning' });
      }
    }catch(e){
      Toast.open({ title:'Apply failed', description:e.message, variant:'error' });
    }
  }

  function clearAll(){
    selectedJobs.clear();
    box.jobs.querySelectorAll('input[type=checkbox]').forEach(chk => { chk.checked = false; });
    box.stats.innerHTML = '';
    window.dispatchEvent(new CustomEvent('analytics:overlay:clear'));
    Toast.open({ title:'Overlays cleared', variant:'info' });
  }

  function exportCsv(){
    const ids = Array.from(selectedJobs.keys());
    if (!ids.length){ Toast.open({ title:'Select jobs first', variant:'warning' }); return; }
    window.open(`/analytics/overlays.csv?job_ids=${ids.join(',')}`, '_blank');
  }

  btn.load.addEventListener('click', loadJobs);
  btn.apply.addEventListener('click', applyOverlays);
  btn.clear.addEventListener('click', clearAll);
  btn.export.addEventListener('click', exportCsv);

  // Auto-refresh on new succeeded job
  const es = new EventSource('/jobs/stream');
  es.onmessage = (e)=>{
    const m = JSON.parse(e.data);
    if (m?.job?.status === 'succeeded'){
      loadJobs();
      const id = Toast.open({ title:`Job #${m.job.id} finished`, variant:'success', actions:[{id:'apply',label:'Apply'}] });
      const on = (ev)=>{
        if (ev.detail?.id===id && ev.detail.actionId==='apply'){
          Toast.close(id);
          selectedJobs.clear();
          selectedJobs.set(m.job.id, { id: m.job.id, artifacts: [] });
          applyOverlays();
          window.removeEventListener('toast:action', on);
        }
      };
      window.addEventListener('toast:action', on);
    }
  };

  return { unmount(){ try{ es.close(); }catch(e){ /* ignore */ } } };
}
