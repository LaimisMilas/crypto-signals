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

const state = {
  chart: null,
  overlays: new Map(),
  filters: {
    symbol: 'SOLUSDT',
    interval: '1m',
    from_ms: '',
    to_ms: '',
    strategy: '',
    ds: 'lttb',
    n: 1000,
  },
};

export function persistFilters(store = localStorage) {
  try { store.setItem('analyticsFilters', JSON.stringify(state.filters)); } catch {}
}

export function loadFilters(doc = document, store = localStorage) {
  try {
    const raw = store.getItem('analyticsFilters');
    if (!raw) return;
    const data = JSON.parse(raw);
    Object.assign(state.filters, data);
    doc.querySelector('[name=symbol]').value = state.filters.symbol || '';
    doc.querySelector('[name=interval]').value = state.filters.interval || '';
    doc.querySelector('[name=from]').value = state.filters.from_ms || '';
    doc.querySelector('[name=to]').value = state.filters.to_ms || '';
    const stratEl = doc.querySelector('[name=strategy]');
    if (stratEl) stratEl.value = state.filters.strategy || '';
    doc.querySelector('[name=ds]').value = state.filters.ds || '';
    doc.querySelector('[name=n]').value = String(state.filters.n ?? '');
  } catch {}
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

export function upsertOverlay(id, points, label) {
  state.overlays.set(String(id), points);
  const series = points.map(p => ({ x: p.ts, y: p.equity }));
  const ds = { id: `overlay-${id}`, label, data: series, fill: false };
  const i = state.chart.data.datasets.findIndex(d => d.id === `overlay-${id}`);
  if (i >= 0) state.chart.data.datasets[i] = ds; else state.chart.data.datasets.push(ds);
  state.chart.update();
}

export function removeOverlay(id) {
  state.overlays.delete(String(id));
  state.chart.data.datasets = state.chart.data.datasets.filter(d => d.id !== `overlay-${id}`);
  state.chart.update();
}

export function getChart() { return state.chart; }

async function fetchJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} [${r.status}]`);
  return r.json();
}

export async function fetchBaseline(doc = document) {
  try {
    const qs = composeAnalyticsQuery(state.filters);
    const url = `/analytics?baseline=live&${qs}`;
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
  } catch (e) {
    showToast(`Failed to load baseline ${e.message || ''}`.trim(), { type: 'error', doc });
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
  try {
    const data = await fetchJSON('/analytics/jobs?limit=20');
    renderJobsTable(data.jobs || data, doc);
    renderOverlayList(data.jobs || data, doc);
  } catch (e) {
    showToast(`Failed to load jobs ${e.message || ''}`.trim(), { type: 'error', doc });
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
    tr.innerHTML = `<td>${job.id}</td><td>${job.type || ''}</td><td>${job.symbol || ''}</td><td>${job.strategy || ''}</td><td>${job.status || ''}</td><td>${(job.artifacts||[]).map(a=>`<a href="${a.url}">${a.name||'dl'}</a>`).join(', ')}</td>`;
    tbody.appendChild(tr);
  });
}

export function updateCsvLink(doc = document) {
  const link = doc.querySelector('[data-export-csv]');
  if (!link) return;
  const ids = Array.from(state.overlays.keys());
  link.href = composeCsvUrl(ids, { from_ms: state.filters.from_ms, to_ms: state.filters.to_ms });
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
  loadFilters(doc);
  fetchBaseline(doc);
  fetchJobs(doc);
  const refreshBtn = doc.querySelector('[data-jobs-refresh]');
  if (refreshBtn) refreshBtn.addEventListener('click', () => fetchJobs(doc));
  const applyBtn = doc.querySelector('[data-apply]');
  if (applyBtn) applyBtn.addEventListener('click', () => {
    state.filters = {
      symbol: doc.querySelector('[name=symbol]').value,
      interval: doc.querySelector('[name=interval]').value,
      from_ms: doc.querySelector('[name=from]').value,
      to_ms: doc.querySelector('[name=to]').value,
      strategy: doc.querySelector('[name=strategy]')?.value || '',
      ds: doc.querySelector('[name=ds]').value,
      n: Number(doc.querySelector('[name=n]').value),
    };
    persistFilters();
    fetchBaseline(doc);
  });
  const resetBtn = doc.querySelector('[data-reset]');
  if (resetBtn) resetBtn.addEventListener('click', () => {
    doc.querySelector('[name=symbol]').value = 'SOLUSDT';
    doc.querySelector('[name=interval]').value = '1m';
    doc.querySelector('[name=from]').value = '';
    doc.querySelector('[name=to]').value = '';
    const stratEl = doc.querySelector('[name=strategy]');
    if (stratEl) stratEl.value = '';
    doc.querySelector('[name=ds]').value = 'lttb';
    doc.querySelector('[name=n]').value = '1000';
    state.filters = { symbol:'SOLUSDT', interval:'1m', from_ms:'', to_ms:'', strategy:'', ds:'lttb', n:1000 };
    persistFilters();
    fetchBaseline(doc);
  });
}

if (typeof window !== 'undefined' && !window.__DISABLE_AUTO_INIT__) {
  window.addEventListener('DOMContentLoaded', () => init());
}
