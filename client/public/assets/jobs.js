import './auth.js';

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

async function fetchJobs(){
  try {
    const res = await fetch('/jobs');
    if (!res.ok) throw new Error('Failed to fetch jobs');
    const jobs = await res.json();
    const tbody = document.querySelector('#jobs-table tbody');
    tbody.innerHTML = jobs.map(j=>`<tr id="job-${j.id}"><td>${j.id}</td><td>${j.type}</td><td>${j.status}</td><td>${Math.round((j.progress||0)*100)}%</td><td><button data-view="${j.id}">view</button> <button data-cancel="${j.id}">cancel</button></td></tr>`).join('');
  } catch (e) {
    console.error('fetchJobs error', e);
    window.Toast?.open({ title:'Jobs fetch failed', body:e.message, variant:'error' });
  }
}
fetchJobs();

document.getElementById('job-form').addEventListener('submit', async e=>{
  e.preventDefault();
  const type = document.getElementById('job-type').value;
  let params;
  try { params = JSON.parse(document.getElementById('job-params').value||'{}'); } catch { alert('Bad JSON'); return; }
  const priority = Number(document.getElementById('job-priority').value);
  await fetch('/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type,params,priority})});
  document.getElementById('job-params').value='{}';
  fetchJobs();
});

document.querySelector('#jobs-table').addEventListener('click', async e=>{
  if(e.target.dataset.view){ showDetail(Number(e.target.dataset.view)); }
  if(e.target.dataset.cancel){ await fetch(`/jobs/${e.target.dataset.cancel}/cancel`,{method:'POST'}); }
});

let es; // EventSource for detail
async function showDetail(id){
  const res = await fetch(`/jobs/${id}`);
  const data = await res.json();
  document.getElementById('detail-id').textContent = id;
  document.getElementById('log').textContent = data.logs.map(l=>`[${l.level}] ${l.msg}`).join('\n');
  document.getElementById('artifacts').innerHTML = data.artifacts.map(a=>`<li><a href="/jobs/${id}/artifacts/${a.id}/download">${a.label||a.kind}</a></li>`).join('');
  document.getElementById('detail').style.display='block';
  updateProgress(id, data.job.progress||0);
  if(es) es.close();
  es = new EventSource(`/jobs/stream?id=${id}`);
  es.addEventListener('job', ev=>{
    const j = JSON.parse(ev.data);
    updateProgress(id, j.progress||0);
    fetchJobs();
    if (j.meta) document.getElementById('detail-trace').innerHTML = BadgeTrace(j.meta);
  });
  es.addEventListener('log', ev=>{
    const l = JSON.parse(ev.data);
    const logEl = document.getElementById('log');
    logEl.textContent += `\n[${l.level}] ${l.msg}`;
    logEl.scrollTop = logEl.scrollHeight;
    if (l.meta) document.getElementById('detail-trace').innerHTML = BadgeTrace(l.meta);
  });
}

function updateProgress(id, p){
  document.querySelector(`#job-${id} td:nth-child(4)`).textContent = Math.round(p*100)+"%";
  document.getElementById('detail-progress').style.width = (p*100)+"%";
}

const esList = new EventSource('/jobs/stream');
esList.addEventListener('job', ev=>{
  const j = JSON.parse(ev.data);
  fetchJobs();
  if(document.getElementById('detail').style.display !== 'none' && Number(document.getElementById('detail-id').textContent)===j.id){ updateProgress(j.id, j.progress||0); }
});

