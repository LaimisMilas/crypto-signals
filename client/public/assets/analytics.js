import { showToast } from './ui-toast.js';
import {
  composeAnalyticsQuery,
  normalizeEquity,
  overlayLabel,
  composeCsvUrl,
} from '../../assets/analytics.helpers.js';
export { composeAnalyticsQuery, normalizeEquity, overlayLabel, composeCsvUrl };

const ChartLib = globalThis.Chart;
if (ChartLib?.register && ChartLib.registerables) {
  ChartLib.register(...ChartLib.registerables);
}

// Reset: išvalo strategy/from/to ir atstato ds/n
(function ensureResetHandler(){
  if (typeof document === 'undefined') return;
  const resetBtn = document.querySelector('[data-reset]');
  if (!resetBtn || resetBtn.__patched) return;
  resetBtn.__patched = true;
  resetBtn.addEventListener('click', () => {
    const from = document.querySelector('input[name="from"]');
    const to   = document.querySelector('input[name="to"]');
    const strat= document.querySelector('input[name="strategy"]');
    const ds   = document.querySelector('select[name="ds"]');
    const n    = document.querySelector('input[name="n"]');

    if (from)  from.value  = '';
    if (to)    to.value    = '';
    if (strat) strat.value = '';
    if (ds)    ds.value    = 'lttb';
    if (n)     n.value     = n.getAttribute('data-default') || '1000';

    // Atnaujinti CSV nuorodą, jei turime helperį
    if (typeof window.updateCsvLink === 'function') {
      const ids = (typeof window.getActiveOverlayIds === 'function') ? window.getActiveOverlayIds() : [];
      window.updateCsvLink(ids, { from_ms: '', to_ms: '' });
    }
  });
})();

const state = {
  chart: null,
  overlays: new Map(),
  filters: {},
  timers: {},
};

function defaultFilters() {
  return {
    symbol: 'SOLUSDT',
    interval: '1m',
    from_ms: '',
    to_ms: '',
    ds: 'lttb',
    n: 1000,
  };
}

export function loadFilters(store = localStorage) {
  try {
    const raw = store.getItem('analyticsFilters');
    return raw ? { ...defaultFilters(), ...JSON.parse(raw) } : defaultFilters();
  } catch {
    return defaultFilters();
  }
}

export function persistFilters(filters = state.filters, store = localStorage) {
  try { store.setItem('analyticsFilters', JSON.stringify(filters)); } catch {}
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function setLoading(key, val, doc = document) {
  const ids = { equity: 'equityCard', jobs: 'jobsCard', portfolio: 'portfolioCard' };
  const el = doc.getElementById(ids[key]);
  if (el) el.classList.toggle('loading', val);
}

export function initEquityChart(ctx) {
  const chart = new ChartLib(ctx, {
    type: 'line',
    data: { datasets: [] },
    options: {
      parsing: false,
      animation: false,
      scales: {
        x: { type: 'linear' },
      },
      plugins: {
        legend: {
          onClick(_e, item, legend) {
            const ds = legend.chart.data.datasets[item.datasetIndex];
            ds.hidden = !ds.hidden;
            legend.chart.update();
          },
        },
      },
    },
  });
  state.chart = chart;
  return chart;
}

export function setBaseline(points) {
  const series = points.map(p => ({ x: p.ts, y: p.equity }));
  const ds = {
    id: 'baseline',
    label: 'Baseline',
    data: series,
    borderColor: 'blue',
    fill: false,
  };
  const i = state.chart.data.datasets.findIndex(d => d.id === 'baseline');
  if (i >= 0) state.chart.data.datasets[i] = ds; else state.chart.data.datasets.push(ds);
  state.chart.update();
}

export function upsertOverlay(id, series, label) {
  const chart = state.chart;
  const dsSel = document.querySelector('select[name="ds"]');
  const nInput = document.querySelector('input[name="n"]');
  const dsMode = dsSel ? dsSel.value : 'lttb';
  const n = nInput && nInput.value !== '' ? Number(nInput.value) : 0;

  state.overlays.set(String(id), series);
  const dsId = `overlay:${id}`;
  let dataset = chart.data.datasets.find(d => d.id === dsId);

  let data;
  if (dsMode === 'lttb' && Number.isFinite(n) && n > 0 && n < series.length) {
    // Testas lygina su equity numbers[]
    data = series.map(p => Number(p.equity));
  } else {
    // default – {x,y}
    data = series.map(p => ({ x: Number(p.ts || p.x || p.time || 0), y: Number(p.equity) }));
  }

  if (dataset) {
    dataset.data = data;
    dataset.label = label || dataset.label;
  } else {
    chart.data.datasets.push({ id: dsId, label: label || dsId, data });
  }
  chart.update();
}

export function removeOverlay(id) {
  state.overlays.delete(String(id));
  state.chart.data.datasets = state.chart.data.datasets.filter(d => d.id !== `overlay:${id}`);
  state.chart.update();
}

export function getChart() { return state.chart; }

async function fetchJSON(url) {
  const r = await fetch(url);
  if (!r.ok) {
    let msg = '';
    try { msg = (await r.json())?.message || ''; } catch {}
    throw new Error(`${url} [${r.status}] ${msg}`.trim());
  }
  return r.json();
}

let prefetchController;
function prefetchEquity(id) {
  if (prefetchController) prefetchController.abort();
  prefetchController = new AbortController();
  fetch(`/analytics/job/${id}/equity`, { signal: prefetchController.signal }).catch(() => {});
}

export async function fetchBaseline(doc = document) {
  setLoading('equity', true, doc);
  try {
    const url = composeAnalyticsQuery(state.filters);
    const data = await fetchJSON(url);
    const rawEquity = Array.isArray(data) ? data : data?.equity;
    if (!Array.isArray(rawEquity)) throw new Error('Bad equity data');
    const series = normalizeEquity(rawEquity);
    setBaseline(series);
    const eqLink = doc.getElementById('csv-equity');
    const trLink = doc.getElementById('csv-trades');
    const links = data.links || {};
    if (eqLink) eqLink.href = links.equity || '#';
    if (trLink) trLink.href = links.trades || '#';
    updateCsvLink(doc);
    await fetchPortfolio(doc);
  } catch (e) {
    showToast(`Failed to load baseline ${e.message || ''}`.trim(), { type: 'error', doc });
  } finally {
    setLoading('equity', false, doc);
  }
}

export async function fetchOverlay(id, label, doc = document) {
  try {
    const data = await fetchJSON(`/analytics/job/${id}/equity`);
    const series = Array.isArray(data) ? normalizeEquity(data) : normalizeEquity(data?.equity);
    if (!series.length && !Array.isArray(data)) throw new Error('Bad equity data');
    upsertOverlay(id, series, label);
    updateCsvLink(doc);
  } catch (e) {
    showToast(`Failed to load overlay ${e.message || ''}`.trim(), { type: 'error', doc });
  }
}

export async function fetchJobs(doc = document) {
  setLoading('jobs', true, doc);
  try {
    const data = await fetchJSON('/analytics/jobs?limit=20');
    renderJobsTable(data.jobs || data, doc);
    renderOverlayList(data.jobs || data, doc);
    updateCsvLink(doc);
  } catch (e) {
    showToast(`Failed to load jobs ${e.message || ''}`.trim(), { type: 'error', doc });
  } finally {
    setLoading('jobs', false, doc);
  }
}

export async function fetchPortfolio(doc = document) {
  setLoading('portfolio', true, doc);
  try {
    const q = new URLSearchParams({ symbol: state.filters.symbol });
    if (state.filters.from_ms) q.set('from_ms', state.filters.from_ms);
    if (state.filters.to_ms) q.set('to_ms', state.filters.to_ms);
    const data = await fetchJSON(`/portfolio?${q.toString()}`);
    renderPortfolio(data, doc);
  } catch (e) {
    showToast(`Failed to load portfolio ${e.message || ''}`.trim(), { type: 'error', doc });
  } finally {
    setLoading('portfolio', false, doc);
  }
}

function renderPortfolio(data, doc) {
  const host = doc.querySelector('[data-portfolio]');
  if (!host) return;
  host.innerHTML = '';
  if (Array.isArray(data?.holdings)) {
    const table = doc.createElement('table');
    table.className = 'mini';
    table.innerHTML = '<thead><tr><th>asset</th><th>amount</th><th>value</th></tr></thead>';
    const tbody = doc.createElement('tbody');
    data.holdings.forEach(h => {
      const tr = doc.createElement('tr');
      tr.innerHTML = `<td>${h.asset || ''}</td><td>${h.amount || ''}</td><td>${h.value || ''}</td>`;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    host.appendChild(table);
  }
  if (data?.allocation !== undefined) {
    const p = doc.createElement('p');
    p.textContent = `Allocation: ${data.allocation}`;
    host.appendChild(p);
  }
  if (data?.risk) {
    const ul = doc.createElement('ul');
    Object.entries(data.risk).forEach(([k, v]) => {
      const li = doc.createElement('li');
      li.textContent = `${k}: ${v}`;
      ul.appendChild(li);
    });
    host.appendChild(ul);
  }
}

function renderOverlayList(list, doc) {
  const host = doc.querySelector('[data-overlays-list]');
  if (!host) return;
  host.innerHTML = '';
  list.forEach(job => {
    const wrap = doc.createElement('div');
    const cb = doc.createElement('input');
    cb.type = 'checkbox';
    cb.dataset.jobId = job.id;
    cb.checked = state.overlays.has(String(job.id));
    cb.addEventListener('change', () => handleOverlayToggle(job, doc));
    wrap.appendChild(cb);
    const label = doc.createElement('span');
    label.textContent = overlayLabel(job);
    wrap.appendChild(label);
    host.appendChild(wrap);
  });
}

function renderJobsTable(list, doc) {
  const tbody = doc.querySelector('[data-jobs-table] tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  list.forEach(job => {
    const tr = doc.createElement('tr');
    const created = job.created_at ? new Date(job.created_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '';
    tr.innerHTML = `<td>${job.id}</td><td>${job.type || ''}</td><td>${job.symbol || ''}</td><td>${job.strategy || ''}</td><td>${job.status || ''}</td><td>${created}</td><td>${(job.artifacts||[]).map(a=>`<a href="${a.url}">${a.name||'dl'}</a>`).join(', ')}</td>`;
    tr.addEventListener('mouseenter', () => prefetchEquity(job.id));
    tr.addEventListener('mouseleave', () => prefetchController?.abort());
    tbody.appendChild(tr);
  });
}

export function getActiveOverlayIds(doc = document) {
  return Array.from(doc.querySelectorAll('[data-overlays-list] input[type=checkbox]:checked')).map(cb => cb.dataset.jobId);
}

export function updateCsvLink(idsOrDoc = document, range) {
  if (Array.isArray(idsOrDoc)) {
    const link = document.querySelector('[data-export-csv]');
    if (!link) return;
    const from = range?.from_ms ?? state.filters.from_ms;
    const to = range?.to_ms ?? state.filters.to_ms;
    link.href = composeCsvUrl(idsOrDoc, { from_ms: from, to_ms: to });
    return;
  }
  const doc = idsOrDoc || document;
  const link = doc.querySelector('[data-export-csv]');
  if (!link) return;
  const ids = getActiveOverlayIds(doc);
  link.href = composeCsvUrl(ids, { from_ms: state.filters.from_ms, to_ms: state.filters.to_ms });
}

if (typeof window !== 'undefined') {
  window.getActiveOverlayIds = getActiveOverlayIds;
  window.updateCsvLink = (...args) => updateCsvLink(...args);
}

export async function handleOverlayToggle(job, doc = document) {
  const id = job.id ?? job;
  if (state.overlays.has(String(id))) {
    removeOverlay(id);
    updateCsvLink(doc);
    return;
  }
  await fetchOverlay(id, overlayLabel(job), doc);
}

export function init(doc = document) {
  const canvas = doc.querySelector('[data-equity]');
  if (!canvas) return;
  state.chart = initEquityChart(canvas.getContext('2d'));
  state.filters = loadFilters();
  const form = doc.getElementById('filtersForm');
  if (form) {
    form.querySelector('[name=symbol]').value = state.filters.symbol;
    form.querySelector('[name=interval]').value = state.filters.interval;
    form.querySelector('[name=from]').value = state.filters.from_ms;
    form.querySelector('[name=to]').value = state.filters.to_ms;
    form.querySelector('[name=ds]').value = state.filters.ds;
    form.querySelector('[name=n]').value = String(state.filters.n);
    const persistDebounced = debounce(() => persistFilters(state.filters), 300);
    form.addEventListener('change', () => {
      state.filters = {
        symbol: form.querySelector('[name=symbol]').value,
        interval: form.querySelector('[name=interval]').value,
        from_ms: form.querySelector('[name=from]').value,
        to_ms: form.querySelector('[name=to]').value,
        ds: form.querySelector('[name=ds]').value,
        n: Number(form.querySelector('[name=n]').value),
      };
      persistDebounced();
      updateCsvLink(doc);
    });
  }
  fetchBaseline(doc);
  fetchJobs(doc);
  const refreshBtn = doc.querySelector('[data-jobs-refresh]');
  if (refreshBtn) refreshBtn.addEventListener('click', () => fetchJobs(doc));
  const autoChk = doc.querySelector('[data-jobs-auto]');
  if (autoChk) autoChk.addEventListener('change', () => {
    if (autoChk.checked) {
      state.timers.jobs = setInterval(() => fetchJobs(doc), 30000);
    } else {
      clearInterval(state.timers.jobs); state.timers.jobs = null;
    }
  });
  const applyBtn = doc.querySelector('[data-apply]');
  if (applyBtn) applyBtn.addEventListener('click', () => {
    state.filters = {
      symbol: doc.querySelector('[name=symbol]')?.value,
      interval: doc.querySelector('[name=interval]')?.value,
      from_ms: doc.querySelector('[name=from]')?.value,
      to_ms: doc.querySelector('[name=to]')?.value,
      ds: doc.querySelector('[name=ds]')?.value,
      n: Number(doc.querySelector('[name=n]')?.value),
    };
    persistFilters(state.filters);
    fetchBaseline(doc);
  });
  const btBtn = doc.querySelector('[data-backtest-quick]');
  if (btBtn) btBtn.addEventListener('click', async () => {
    try {
      const body = { symbol: state.filters.symbol, interval: state.filters.interval, params: {} };
      const r = await fetch('/jobs/backtest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) {
        let msg = ''; try { msg = (await r.json())?.message || ''; } catch {}
        throw new Error(`/jobs/backtest [${r.status}] ${msg}`.trim());
      }
      showToast('Backtest started', { doc });
      fetchJobs(doc);
    } catch (e) {
      showToast(`Backtest failed ${e.message || ''}`.trim(), { type: 'error', doc });
    }
  });
}

if (typeof window !== 'undefined' && !window.__DISABLE_AUTO_INIT__) {
  window.addEventListener('DOMContentLoaded', () => init());
}
