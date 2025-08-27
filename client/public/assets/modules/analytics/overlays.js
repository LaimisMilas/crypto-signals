// assets/modules/analytics/overlays.js
/* eslint-env browser */
/* global Toast */
export async function mount(root){
  root.innerHTML = `
    <div style="display:flex;gap:8px;align-items:end;flex-wrap:wrap">
      <div><label>Type<br><select id="ov-type"><option value="">Any</option><option>backtest</option><option>optimize</option><option>walkforward</option></select></label></div>
      <div><label>Symbol<br><input id="ov-symbol" placeholder="e.g. BTCUSDT"></label></div>
      <div><label>Strategy<br><input id="ov-strategy" placeholder="e.g. ema"></label></div>
      <div><label><input type="checkbox" id="ov-baseline"> Use Live as baseline</label></div>
      <div><label>Align<br><select id="ov-align"><option value="none">none</option><option value="first-common">first-common</option></select></label></div>
      <div><label>Rebase to<br><select id="ov-rebase"><option value="">—</option><option value="100">100</option></select></label></div>
      <button id="ov-load" class="btn">Load jobs</button>
      <button id="ov-apply" class="btn">Apply overlays</button>
      <button id="ov-clear" class="btn">Clear all</button>
      <button id="ov-export" class="btn">Export CSV</button>
      <button id="ov-share" class="btn">Share URL</button>
    </div>
    <div style="display:flex;gap:8px;margin-top:8px">
      <button id="ov-report-zip" class="btn">Download Report (ZIP)</button>
      <button id="ov-report-zip-png" class="btn">Download Report + PNG</button>
      <button id="ov-report-html" class="btn">Open HTML Report</button>
    </div>
    <div style="margin-top:12px;display:flex;gap:8px;align-items:end;flex-wrap:wrap">
      <div><label>Optimize job ID<br><input id="ov-top-id" style="width:100px"></label></div>
      <div><label>N<br><input id="ov-top-n" type="number" min="1" max="5" value="3" style="width:60px"></label></div>
      <div><label>Smooth/Downsample<br><input id="ov-tol" type="range" min="0" max="5" step="1" value="0"></label></div>
      <button id="ov-top-inline" class="btn">Load TOP-N (inline)</button>
      <button id="ov-top-load" class="btn">Load TOP-N</button>
    </div>
    <div id="ov-jobs" style="margin-top:12px"></div>
    <div id="ov-stats" style="margin-top:12px"></div>
    <div id="ov-top-results" style="margin-top:12px"></div>
    <div id="ov-sets" style="margin-top:16px">
      <div style="display:flex;gap:8px;align-items:end;flex-wrap:wrap">
        <label>Name<br><input id="ov-set-name" placeholder="e.g. EMA vs ADX (Live)"></label>
        <button id="ov-set-save" class="btn">Save Set</button>
      </div>
      <div id="ov-set-list" style="margin-top:10px"></div>
    </div>
  `;

  const el = id => root.querySelector(id);
  const input = { type: el('#ov-type'), symbol: el('#ov-symbol'), strategy: el('#ov-strategy'), topId: el('#ov-top-id'), topN: el('#ov-top-n'), tol: el('#ov-tol') };
  const btn = { load: el('#ov-load'), apply: el('#ov-apply'), clear: el('#ov-clear'), export: el('#ov-export'), share: el('#ov-share'), reportZip: el('#ov-report-zip'), reportZipPng: el('#ov-report-zip-png'), reportHtml: el('#ov-report-html'), topLoad: el('#ov-top-load'), topInline: el('#ov-top-inline') };
  const box = { jobs: el('#ov-jobs'), stats: el('#ov-stats'), top: el('#ov-top-results'), sets: el('#ov-set-list') };
  const chkBaseline = el('#ov-baseline');
  const selectAlign = el('#ov-align');
  const selectRebase = el('#ov-rebase');

  const COLORS = ['#4cc9f0','#ffd166','#06d6a0','#ef476f','#118ab2'];
  const colorOf = (jobId) => COLORS[jobId % COLORS.length];

  const selectedJobs = new Map();
  const queuedJobIds = new Set();
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

  function renderStats(stats, baseline){
    if (!stats || !selectedJobs.size){ box.stats.innerHTML=''; return; }
    const ids = Array.from(selectedJobs.keys());
    const fmtPct = v => (v==null? '-': (v*100).toFixed(2)+'%');

    let baseReturn = 0;
    let baseMaxDD = 0;
    if (baseline && baseline.equity?.length){
      const eq = baseline.equity;
      baseReturn = eq.at(-1).equity / eq[0].equity - 1;
      let peak = -Infinity;
      eq.forEach(p => { peak = Math.max(peak, p.equity); baseMaxDD = Math.min(baseMaxDD, (p.equity / peak - 1)); });
    }else{
      const baseId = ids[0];
      const base = stats[baseId] || { return:0, maxDD:0 };
      baseReturn = base.return || 0;
      baseMaxDD = base.maxDD || 0;
    }

    const rows = ids.map(id => {
      const j = selectedJobs.get(id) || {};
      const s = stats[id] || {};
      const pf = j.result?.profitFactor;
      const dR = baseline ? s.deltaReturn : (s.return - baseReturn);
      const dD = baseline ? s.deltaMaxDD : (s.maxDD - baseMaxDD);
      return `<tr>
        <td><span style="display:inline-block;width:10px;height:10px;background:${colorOf(id)};margin-right:4px"></span>#${id}</td>
        <td>${j.type||''}</td>
        <td>${j.params?.symbol||'-'}</td>
        <td>${fmtPct(s.return)}</td>
        <td>${fmtPct(dR)}</td>
        <td>${fmtPct(s.maxDD)}</td>
        <td>${fmtPct(dD)}</td>
        <td>${pf ?? '-'}</td>
      </tr>`;
    }).join('');
    const deltaRetLabel = baseline ? 'ΔReturn vs Baseline' : 'ΔReturn';
    const deltaDdLabel = baseline ? 'ΔMaxDD vs Baseline' : 'ΔMaxDD';
    box.stats.innerHTML = `<table class="table"><thead><tr><th>Job</th><th>Type</th><th>Symbol</th><th>Return</th><th>${deltaRetLabel}</th><th>MaxDD</th><th>${deltaDdLabel}</th><th>PF</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  async function applyOverlays(){
    const ids = Array.from(selectedJobs.keys());
    if (!ids.length){ Toast.open({ title:'Select jobs first', variant:'warning' }); return; }
    const baseline = chkBaseline.checked ? 'live' : 'none';
    const align = selectAlign.value;
    const rebase = selectRebase.value;
    try{
      const params = new URLSearchParams();
      params.set('overlay_job_ids', ids.join(','));
      if (baseline !== 'none') params.set('baseline', baseline);
      if (align !== 'none') params.set('overlay_align', align);
      const res = await fetch(`/analytics?${params.toString()}`);
      const json = await res.json();
      const items = json.overlayEquities || [];
      const stats = json.overlayStatsByJobId || {};
      const baselineObj = json.baseline || null;
      const missing = ids.filter(id => !items.find(it => it.jobId === id));
      if (items.length){
        window.dispatchEvent(new CustomEvent('analytics:overlays:v2', { detail:{ items, baseline: baselineObj, settings:{ align, rebase: rebase || null } } }));
        renderStats(stats, baselineObj);
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

  async function shareUrl(){
    const jobIds = Array.from(selectedJobs.keys());
    if (!jobIds.length){ Toast.open({ title:'Select jobs first', variant:'warning' }); return; }
    try{
      const res = await fetch('/analytics/overlays/share', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ jobIds, baseline: chkBaseline.checked ? 'live' : 'none', align: selectAlign.value, rebase: selectRebase.value || null })
      });
      const json = await res.json();
      const fullUrl = location.origin + json.url;
      await navigator.clipboard.writeText(fullUrl);
      Toast.open({ title:'URL copied', variant:'success' });
    }catch(e){
      Toast.open({ title:'Share failed', description:e.message, variant:'error' });
    }
  }

  async function loadTopN(){
    const jobId = Number(input.topId.value);
    const n = Number(input.topN.value) || 3;
    if (!jobId){ Toast.open({ title:'Optimize job ID required', variant:'warning' }); return; }
    try{
      const res = await fetch(`/analytics/optimize/${jobId}/top?n=${n}`);
      const json = await res.json();
      const rows = json.top || [];
      if (!rows.length){ box.top.innerHTML = '<div style="opacity:.7">No results</div>'; return; }
      box.top.innerHTML = `<table class="table"><thead><tr><th>#</th><th>Score</th><th>Params</th><th></th></tr></thead><tbody>${rows.map((r,i)=>{ const score = r.cagr ?? r.return ?? r.pf ?? ''; const params = Object.entries(r).filter(([k])=>!['cagr','return','pf','profitFactor','maxDD'].includes(k)).map(([k,v])=>`${k}=${v}`).join(' '); return `<tr><td>${i+1}</td><td>${score}</td><td style="font-size:12px">${params}</td><td><button data-idx="${i}" class="btn btn-xs">Queue backtest</button></td></tr>`; }).join('')}</tbody></table>`;
      box.top.querySelectorAll('button[data-idx]').forEach(btn=>{
        btn.addEventListener('click', async () => {
          const params = rows[Number(btn.dataset.idx)];
          try{
            const r = await fetch('/jobs', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ type:'backtest', params }) });
            const j = await r.json();
            queuedJobIds.add(j.id);
            Toast.open({ title:`Backtest queued #${j.id}`, variant:'success' });
          }catch(e){
            Toast.open({ title:'Queue failed', description:e.message, variant:'error' });
          }
        });
      });
    }catch(e){
      Toast.open({ title:'Load TOP-N failed', description:e.message, variant:'error' });
    }
  }

  async function loadTopNInline(){
    const id = Number(input.topId.value);
    const n = Number(input.topN.value) || 3;
    const tol = Number(input.tol.value) || 0;
    if (!id){ Toast.open({ title:'Optimize job ID required', variant:'warning' }); return; }
    try {
      const json = await fetch(`/analytics/optimize/${id}/inline-overlays?n=${n}&tol=${tol}`).then(r=>r.json());
      if (!json.items?.length){
        Toast.open({ title:'No inline overlays', variant:'warning' });
        return;
      }
      window.dispatchEvent(new CustomEvent('analytics:overlays:inline', { detail:{ items: json.items } }));
      Toast.open({ title:`Loaded TOP-${json.items.length} inline`, variant:'success' });
    } catch (e) {
      Toast.open({ title:'Load inline failed', description:e.message, variant:'error' });
    }
  }

  async function loadSets(){
    box.sets.innerHTML = '<div style="opacity:.7">Loading...</div>';
    try{
      const json = await fetch('/analytics/overlay-sets').then(r=>r.json());
      renderSets(json.sets || []);
    }catch(e){
      box.sets.innerHTML = `<div style="color:#c00">${e.message}</div>`;
    }
  }

  function currentSelection(){
    return {
      jobIds: Array.from(selectedJobs.keys()),
      baseline: chkBaseline.checked ? 'live' : 'none',
      align: selectAlign.value,
      rebase: selectRebase.value || null
    };
  }

  function downloadBlob(filename, blob){
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(()=> URL.revokeObjectURL(a.href), 1000);
  }

  function currentSettings(){
    return {
      jobIds: Array.from(selectedJobs.keys()),
      baseline: chkBaseline.checked ? 'live' : 'none',
      align: selectAlign.value,
      rebase: selectRebase.value || null,
      inline: (input.topId.value ? { optimizeJobId: Number(input.topId.value), n: Number(input.topN.value||3), tol: Number(input.tol.value||0) } : null)
    };
  }

  async function saveSet(){
    const name = root.querySelector('#ov-set-name').value?.trim();
    if (!name){ Toast.open({ title:'Name required', variant:'warning' }); return; }
    const payload = currentSettings();
    const res = await fetch('/analytics/overlay-sets', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name, payload }) });
    const j = await res.json();
    if (!res.ok){ Toast.open({ title:'Save failed', description:j.error||res.statusText, variant:'error' }); return; }
    Toast.open({ title:'Set saved', variant:'success' });
    loadSets();
  }

  function renderSets(sets){
    const el = box.sets;
    if (!sets.length){ el.innerHTML = '<div style="opacity:.7">No saved sets</div>'; return; }
    el.innerHTML = sets.map(s=> `
      <div class="card" data-id="${s.id}" style="padding:10px;border:1px solid #222;border-radius:10px;margin-bottom:6px">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
          <div><b>${s.name}</b> ${s.pinned ? '📌' : ''}</div>
          <div style="display:flex;gap:6px">
            <button data-act="apply">Apply</button>
            <button data-act="rename">Rename</button>
            <button data-act="pin">${s.pinned ? 'Unpin' : 'Pin'}</button>
            <button data-act="share">Share</button>
            <button data-act="export">Export JSON</button>
            <button data-act="delete">Delete</button>
          </div>
        </div>
        <div style="font-size:12px;color:#9aa0a6">${(s.payload?.jobIds||[]).length} jobs • baseline=${s.payload?.baseline} • align=${s.payload?.align} • rebase=${s.payload?.rebase??'-'} ${s.payload?.inline?`• inline: opt#${s.payload.inline.optimizeJobId} TOP-${s.payload.inline.n}`:''}</div>
      </div>
    `).join('');

    el.querySelectorAll('.card').forEach(card=>{
      const id = Number(card.dataset.id);
      card.addEventListener('click', async (e)=>{
        const act = e.target?.dataset?.act;
        if (!act) return;
        if (act==='apply'){
          const s = (sets.find(x=>x.id===id) || {});
          await applyOverlaySet(s.payload);
        } else if (act==='rename'){
          const name = prompt('New name:', sets.find(x=>x.id===id)?.name || '');
          if (!name) return;
          await fetch(`/analytics/overlay-sets/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name }) });
          loadSets();
        } else if (act==='pin'){
          const pinned = !sets.find(x=>x.id===id)?.pinned;
          await fetch(`/analytics/overlay-sets/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ pinned }) });
          loadSets();
        } else if (act==='delete'){
          if (!confirm('Delete this set?')) return;
          await fetch(`/analytics/overlay-sets/${id}`, { method:'DELETE' });
          loadSets();
        } else if (act==='share'){
          const r = await fetch(`/analytics/overlay-sets/${id}/share`, { method:'POST' }).then(r=>r.json());
          const url = r.url || '';
          await navigator.clipboard?.writeText(location.origin + url);
          Toast.open({ title:'Share link copied', description:url, variant:'success' });
        } else if (act==='export'){
          const s = sets.find(x=>x.id===id);
          const blob = new Blob([JSON.stringify(s.payload, null, 2)], { type:'application/json' });
          const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${s.name.replace(/\s+/g,'_')}.overlay.json`; a.click();
        }
      });
    });
  }

  async function applyOverlaySet(pl){
    if (!pl) return;
    chkBaseline.checked = pl.baseline === 'live';
    selectAlign.value = pl.align || 'none';
    selectRebase.value = pl.rebase != null ? String(pl.rebase) : '';
    input.topId.value = pl.inline?.optimizeJobId != null ? String(pl.inline.optimizeJobId) : '';
    input.topN.value = pl.inline?.n != null ? String(pl.inline.n) : '3';
    input.tol.value = pl.inline?.tol != null ? String(pl.inline.tol) : '0';
    selectedJobs.clear();
    (pl.jobIds || []).forEach(id => selectedJobs.set(id, { id, artifacts: [] }));
    renderJobs();
    const ids = pl.jobIds || [];
    const qs = new URLSearchParams({ overlay_job_ids: ids.join(','), baseline: pl.baseline || 'none', overlay_align: pl.align || 'none' });
    const base = await fetch(`/analytics?${qs}`).then(r=>r.json());
    window.dispatchEvent(new CustomEvent('analytics:overlays:v2', {
      detail: { items: base.overlayEquities || [], baseline: base.baseline, settings: { align: pl.align, rebase: pl.rebase } }
    }));
    renderStats(base.overlayStatsByJobId || {}, base.baseline);
    if (pl.inline?.optimizeJobId){
      const inline = await fetch(`/analytics/optimize/${pl.inline.optimizeJobId}/inline-overlays?n=${pl.inline.n||3}&tol=${pl.inline.tol||0}`).then(r=>r.json());
      if (inline.items?.length){
        window.dispatchEvent(new CustomEvent('analytics:overlays:inline', { detail:{ items: inline.items } }));
      }
    }
    Toast.open({ title:'Overlay set applied', variant:'success' });
  }

  btn.load.addEventListener('click', loadJobs);
  btn.apply.addEventListener('click', applyOverlays);
  btn.clear.addEventListener('click', clearAll);
  btn.export.addEventListener('click', exportCsv);
  btn.share.addEventListener('click', shareUrl);
  btn.reportZip.addEventListener('click', async ()=>{
    const s = currentSelection();
    if (!s.jobIds.length){ Toast.open({ title:'Pick at least one job', variant:'warning' }); return; }
    const qs = new URLSearchParams({
      job_ids: s.jobIds.join(','), baseline: s.baseline, overlay_align: s.align, overlay_rebase: s.rebase||''
    });
    const res = await fetch(`/analytics/overlays/report?${qs}`);
    if (!res.ok){ Toast.open({ title:'Report failed', description: res.statusText, variant:'error' }); return; }
    const blob = await res.blob();
    downloadBlob('analytics-report.zip', blob);
    Toast.open({ title:'Report downloaded', variant:'success' });
  });
  btn.reportZipPng.addEventListener('click', async ()=>{
    const s = currentSelection();
    if (!s.jobIds.length){ Toast.open({ title:'Pick at least one job', variant:'warning' }); return; }
    try{
      const png = window.AnalyticsChart?.toBase64Image?.();
      const res = await fetch('/analytics/overlays/report', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ ...s, image: png })
      });
      if (!res.ok){ const t=await res.text(); throw new Error(t||res.statusText); }
      const blob = await res.blob();
      downloadBlob('analytics-report.zip', blob);
      Toast.open({ title:'Report (PNG) downloaded', variant:'success' });
    } catch(e){
      Toast.open({ title:'Report failed', description: e.message, variant:'error' });
    }
  });
  btn.reportHtml.addEventListener('click', ()=>{
    const s = currentSelection();
    if (!s.jobIds.length){ Toast.open({ title:'Pick at least one job', variant:'warning' }); return; }
    const params = new URLSearchParams({
      job_ids: s.jobIds.join(','),
      baseline: s.baseline,
      overlay_align: s.align,
      overlay_rebase: s.rebase||'',
      ds: 'lttb',
      n: '1500'
    });
    const url = shareToken ? `/analytics/overlays/share/${shareToken}/report.html` : `/analytics/overlays/report.html?${params.toString()}`;
    window.open(url, '_blank');
  });
  btn.topLoad.addEventListener('click', loadTopN);
  btn.topInline.addEventListener('click', loadTopNInline);
  root.querySelector('#ov-set-save').addEventListener('click', saveSet);
  loadSets();

  // Auto-refresh on new succeeded job
  const es = new EventSource('/jobs/stream');
  es.onmessage = (e)=>{
    const m = JSON.parse(e.data);
    if (m?.job?.status === 'succeeded'){
      loadJobs();
      if (queuedJobIds.has(m.job.id)){
        selectedJobs.set(m.job.id, { id: m.job.id, artifacts: [] });
        queuedJobIds.delete(m.job.id);
        applyOverlays();
        Toast.open({ title:`Job #${m.job.id} finished`, variant:'success' });
      }else{
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
    }
  };

  const shareToken = new URLSearchParams(location.search).get('share');
  if (shareToken){
    try{
      let res = await fetch(`/analytics/overlay-sets/share/${shareToken}`);
      if (res.status === 404) res = await fetch(`/analytics/overlays/share/${shareToken}`);
      const payload = await res.json();
      chkBaseline.checked = payload.baseline === 'live';
      selectAlign.value = payload.align || 'none';
      selectRebase.value = payload.rebase ? String(payload.rebase) : '';
      input.topId.value = payload.inline?.optimizeJobId != null ? String(payload.inline.optimizeJobId) : '';
      input.topN.value = payload.inline?.n != null ? String(payload.inline.n) : '3';
      input.tol.value = payload.inline?.tol != null ? String(payload.inline.tol) : '0';
      await loadJobs();
      await applyOverlaySet(payload);
    }catch(e){
      Toast.open({ title:'Share load failed', description:e.message, variant:'error' });
    }
  }

  return { unmount(){ try{ es.close(); }catch(e){ /* ignore */ } } };
}
