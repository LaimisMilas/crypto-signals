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
      <button id="ov-apply" class="btn">Apply overlay</button>
      <button id="ov-clear" class="btn">Clear overlay</button>
      <button id="ov-sync" class="btn">Sync period</button>
    </div>
    <div id="ov-jobs" style="margin-top:12px"></div>
    <div id="ov-stats" style="margin-top:12px;display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px"></div>
    <div id="ov-artifacts" style="margin-top:12px"></div>
  `;

  const el = id => root.querySelector(id);
  const input = { type: el('#ov-type'), symbol: el('#ov-symbol'), strategy: el('#ov-strategy') };
  const btn = { load: el('#ov-load'), apply: el('#ov-apply'), clear: el('#ov-clear'), sync: el('#ov-sync') };
  const box = { jobs: el('#ov-jobs'), stats: el('#ov-stats'), arts: el('#ov-artifacts') };

  let selectedJob = null;
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
      Toast.open({ title:'Failed to load jobs', description: e.message, variant:'error' });
    }
  }

  function renderJobs(){
    box.jobs.innerHTML = jobs.length ? jobs.map(j => {
      const p = j.params || {};
      const r = j.result || {};
      const sel = (selectedJob && selectedJob.id===j.id) ? 'style="border:1px solid #4cc9f0"' : '';
      return `<div class="card" data-id="${j.id}" ${sel} style="padding:10px;border:1px solid #222;border-radius:10px;margin-bottom:6px;cursor:pointer">
        <div><b>#${j.id}</b> • ${j.type} • ${new Date(j.finished_at||j.created_at).toLocaleString()}</div>
        <div style="font-size:13px;color:#9aa0a6">symbol=${p.symbol||'-'} strategy=${p.strategyId||'-'}</div>
        <div style="font-size:13px">return=${(r.return ?? r.cagr ?? '').toString()} PF=${r.profitFactor ?? ''}</div>
      </div>`;
    }).join('') : '<div style="opacity:.7">No jobs</div>';

    box.jobs.querySelectorAll('[data-id]').forEach(card=>{
      card.addEventListener('click', ()=>{
        const id = Number(card.dataset.id);
        selectedJob = jobs.find(x=>x.id===id);
        renderJobs();
        renderArtifacts();
      });
    });
  }

  function renderArtifacts(){
    if (!selectedJob){ box.arts.innerHTML=''; return; }
    const arts = selectedJob.artifacts || [];
    box.arts.innerHTML = `<div><b>Artifacts</b></div>` + (arts.length? arts.map(a=>(
      `<div><a href="/jobs/${selectedJob.id}/artifacts/${a.id}/download" target="_blank" rel="noopener">${a.label||a.path}</a> <span style="color:#9aa0a6">(${a.kind}, ${a.size_bytes||0} bytes)</span></div>`
    )).join('') : '<div style="opacity:.7">No artifacts</div>');
  }

  async function applyOverlay(){
    if (!selectedJob){ Toast.open({ title:'Pick a job first', variant:'warning' }); return; }
    const url = `/analytics?overlay_job_id=${selectedJob.id}`;
    try{
      const json = await fetch(url).then(r=>r.json());
      if (!json.overlayEquity?.length) {
        Toast.open({ title:'No equity artifact', variant:'warning' });
        return;
      }
      window.dispatchEvent(new CustomEvent('analytics:overlay', { detail: { job: selectedJob, overlay: json.overlayEquity, stats: json.overlayStats }}));
      renderStats(json.overlayStats);
      Toast.open({ title:`Overlay applied (#${selectedJob.id})`, variant:'success' });
    }catch(e){
      Toast.open({ title:'Apply overlay failed', description: e.message, variant:'error' });
    }
  }

  function renderStats(s){
    if (!s){ box.stats.innerHTML=''; return; }
    const fmtPct = v => (v==null? '-': (v*100).toFixed(2)+'%');
    box.stats.innerHTML = `
      <div class="card" style="padding:8px;border:1px solid #222;border-radius:10px"><div>Return</div><b>${fmtPct(s.return)}</b></div>
      <div class="card" style="padding:8px;border:1px solid #222;border-radius:10px"><div>Max DD</div><b>${fmtPct(s.maxDD)}</b></div>
    `;
  }

  function clearOverlay(){
    window.dispatchEvent(new CustomEvent('analytics:overlay:clear'));
    box.stats.innerHTML='';
    Toast.open({ title:'Overlay cleared', variant:'info' });
  }

  function syncPeriod(){
    if (!selectedJob){ Toast.open({ title:'Pick a job first', variant:'warning' }); return; }
    // Heuristika: pasiimti equity artefaktą ir nustatyti from/to pagal pirmą/paskutinį tašką
    fetch(`/analytics/job/${selectedJob.id}/equity`).then(r=>r.json()).then(({ equity })=>{
      if (!equity?.length){ Toast.open({ title:'No equity for sync', variant:'warning' }); return; }
      const from = equity[0].ts, to = equity[equity.length-1].ts;
      window.dispatchEvent(new CustomEvent('analytics:period:set', { detail:{ from, to } }));
      Toast.open({ title:'Period synced to job', variant:'success' });
    }).catch(e=> Toast.open({ title:'Sync failed', description:e.message, variant:'error' }));
  }

  btn.load.addEventListener('click', loadJobs);
  btn.apply.addEventListener('click', applyOverlay);
  btn.clear.addEventListener('click', clearOverlay);
  btn.sync.addEventListener('click', syncPeriod);

  // Auto-refresh gavus naują succeeded job’ą (jei atidarytas šis tab’as)
  const es = new EventSource('/jobs/stream');
  es.onmessage = (e)=>{
    const m = JSON.parse(e.data);
    if (m?.job?.status === 'succeeded'){
      loadJobs();
      const id = Toast.open({ title:`Job #${m.job.id} finished`, variant:'success', actions:[{id:'apply',label:'Apply'}] });
      const on = (ev)=> {
        if (ev.detail?.id===id && ev.detail.actionId==='apply'){
          Toast.close(id);
          selectedJob = { id: m.job.id, artifacts: [] };
          applyOverlay();
          window.removeEventListener('toast:action', on);
        }
      };
      window.addEventListener('toast:action', on);
    }
  };

  return { unmount(){ try{ es.close(); }catch(e){ /* ignore */ } } };
}
