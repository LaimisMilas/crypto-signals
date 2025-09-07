import { getToken } from './auth.js';
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

    // Atnaujinti CSV nuorodą ir fokusą
    if (typeof window.updateCsvLink === 'function') {
      const ids = (typeof window.getActiveOverlayIds === 'function') ? window.getActiveOverlayIds() : [];
      window.updateCsvLink(ids, { from_ms: '', to_ms: '' });
    }
    const heading = document.querySelector('#equityCard h2');
    if (heading) { heading.setAttribute('tabindex','-1'); heading.focus(); }
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
  if (el) el.classList.toggle('is-loading', val);
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
    updateCsvLink();
    await fetchPortfolio(doc);
  } catch (e) {
    showToast(e.message, { type: 'error', doc });
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
    updateCsvLink();
  } catch (e) {
    showToast(e.message, { type: 'error', doc });
  }
}

export async function listJobs(doc = document) {
  setLoading('jobs', true, doc);
  try {
    const data = await fetchJSON('/analytics/jobs?limit=20');
    renderJobsTable(data.jobs || data, doc);
    renderOverlayList(data.jobs || data, doc);
    updateCsvLink();
  } catch (e) {
    showToast(e.message, { type: 'error', doc });
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
    const url = `/portfolio?${q.toString()}`;
    const r = await fetch(url);
    if (r.status === 204) {
      renderPortfolio(null, doc);
    } else if (r.ok) {
      let data = null;
      try { data = await r.json(); } catch {}
      renderPortfolio(data, doc);
    } else {
      let msg = ''; try { msg = (await r.json())?.message || ''; } catch {}
      throw new Error(`${url} [${r.status}] ${msg}`.trim());
    }
  } catch (e) {
    showToast(e.message, { type: 'error', doc });
  } finally {
    setLoading('portfolio', false, doc);
  }
}

function renderPortfolio(data, doc) {
  const host = doc.querySelector('[data-portfolio]');
  if (!host) return;
  host.innerHTML = '';
  if (!data || (!data.holdings && !data.allocation && !data.risk)) {
    host.textContent = 'No portfolio data';
    return;
  }
  if (Array.isArray(data.holdings) && data.holdings.length) {
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
  if (data.allocation && typeof data.allocation === 'object' && Object.keys(data.allocation).length) {
    const table = doc.createElement('table');
    table.className = 'mini';
    table.innerHTML = '<thead><tr><th>asset</th><th>%</th></tr></thead>';
    const tbody = doc.createElement('tbody');
    Object.entries(data.allocation).forEach(([asset, pct]) => {
      const tr = doc.createElement('tr');
      tr.innerHTML = `<td>${asset}</td><td>${pct}</td>`;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    host.appendChild(table);
  }
  if (data.risk && typeof data.risk === 'object') {
    const ul = doc.createElement('ul');
    ['maxDrawdown', 'vol', 'VaR'].forEach(k => {
      if (data.risk[k] != null) {
        const li = doc.createElement('li');
        li.textContent = `${k}: ${data.risk[k]}`;
        ul.appendChild(li);
      }
    });
    if (ul.children.length) host.appendChild(ul);
  }
}

function renderOverlayList(list, doc) {
  const host = doc.querySelector('[data-overlays-list]');
  if (!host) return;
  host.innerHTML = '';
  list.forEach(job => {
    const label = doc.createElement('label');
    const cb = doc.createElement('input');
    cb.type = 'checkbox';
    cb.dataset.overlayId = job.id;
    cb.checked = state.overlays.has(String(job.id));
    cb.addEventListener('change', () => handleOverlayToggle(job, doc));
    label.appendChild(cb);
    label.appendChild(doc.createTextNode(` ${overlayLabel(job)}`));
    host.appendChild(label);
  });
}

function renderJobsTable(list, doc) {
  const tbody = doc.querySelector('[data-jobs-table] tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  list.forEach(job => {
    const tr = doc.createElement('tr');
    const created = job.created_at ? new Date(job.created_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '';
    const arts = (job.artifacts || []).map(a => {
      const name = a.name || (a.url ? a.url.split('/').pop() : 'file');
      return `<a href="${a.url}" download>${name}</a>`;
    }).join(', ');
    tr.innerHTML = `<td>${job.id}</td><td>${job.type || ''}</td><td>${job.symbol || ''}</td><td>${job.strategy || ''}</td><td>${job.status || ''}</td><td>${created}</td><td>${arts}</td>`;
    tr.addEventListener('mouseenter', () => prefetchEquity(job.id));
    tr.addEventListener('mouseleave', () => prefetchController?.abort());
    tbody.appendChild(tr);
  });
}

export function getActiveOverlayIds(doc = document) {
  const ids = [];
  doc.querySelectorAll('[data-overlays-list] input[type=checkbox]:checked').forEach(cb => {
    const id = cb.dataset.overlayId;
    if (id && !ids.includes(id)) ids.push(id);
  });
  return ids;
}



export function updateCsvLink(idsOrDoc = document, range) {
  const link = document.querySelector('[data-export-csv]');
  if (!link) return;

  const enable = (href) => { link.href = href; if (href === '#') link.classList.add('is-disabled'); else link.classList.remove('is-disabled'); };

  const toIds = (v) => {
    // Bendras normalizatorius: priima Array, Set, Map (values), NodeList, HTMLCollection, vieną string ar elementą
    const norm = (input) => {
      if (input == null) return [];
      // vienas string/id
      if (typeof input === 'string' || typeof input === 'number') return [String(input)];
      // jei turi iteratorių -> paverskim į masyvą
      if (typeof input[Symbol.iterator] === 'function') {
        // Map -> imame values, kiti (Set, Array, NodeList) -> tiesiog Array.from
        const iter = (input instanceof Map) ? input.values() : input;
        return Array.from(iter);
      }
      // specialus atvejis {ids:[...]}
      if (Array.isArray(input.ids)) return input.ids.slice();
      return [String(input)];
    };

    // Element/Document šaka
    const idsFromDom = (root) => {
      // 1) helperis, jei yra
      try {
        if (typeof getActiveOverlayIds === 'function') {
          const got = getActiveOverlayIds(root);
          const arr = norm(got).map(x => {
            if (typeof x === 'string' || typeof x === 'number') return String(x);
            if (x && x.dataset && (x.dataset.overlayId || x.dataset.id)) return x.dataset.overlayId || x.dataset.id;
            if (x && typeof x.value === 'string') return x.value;
            return String(x);
          }).filter(Boolean);
          if (arr.length) return arr;
        }
      } catch {}
      // 2) fallback DOM paieška
      const q = root.querySelectorAll
        ? root.querySelectorAll('[data-overlay-id],[data-id],input[name="overlay"],input[type="checkbox"][data-overlay-id]')
        : [];
      return Array.from(q).map(el =>
        (el.dataset && (el.dataset.overlayId || el.dataset.id)) ||
        (typeof el.value === 'string' && el.value) || ''
      ).map(String).filter(Boolean);
    };

    // Pagrindinė šaka
    if (Array.isArray(v)) return v.map(x => String(x)).filter(Boolean);
    if (v && (v.nodeType === 1 || v.nodeType === 9)) return idsFromDom(v);
    // iterable/array-like
    return norm(v).map(x => String(x)).filter(Boolean);
  };;

  if (Array.isArray(idsOrDoc)) {
    const ids = toIds(idsOrDoc);
    if (!ids.length) {
    let _ids = ids.slice();
    try {
      if (!_ids.length && typeof state !== 'undefined' && state && state.overlays && typeof state.overlays.keys === 'function') {
        _ids = Array.from(state.overlays.keys()).map(String).filter(Boolean);
      }
    } catch {}
    try {
      if (!_ids.length && typeof getChart === 'function') {
        const ch = getChart();
        if (ch && ch.data && Array.isArray(ch.data.datasets)) {
          _ids = ch.data.datasets
            .map(d => (d && d.id && String(d.id).startsWith('overlay:') ? String(d.id).split(':')[1] : ''))
            .filter(Boolean);
        }
      }
    } catch {}
    if (!_ids.length) return enable('#');
    const from = range?.from_ms ?? (typeof state !== 'undefined' ? state.filters?.from_ms : '');
    const to   = range?.to_ms   ?? (typeof state !== 'undefined' ? state.filters?.to_ms   : '');
    return enable(composeCsvUrl(_ids, { from_ms: from, to_ms: to }));
  }
    return enable(composeCsvUrl(ids, {
      from_ms: range?.from_ms ?? (typeof state !== 'undefined' ? state.filters?.from_ms : ''),
      to_ms:   range?.to_ms   ?? (typeof state !== 'undefined' ? state.filters?.to_ms   : '')
    }));
  }

  const ids = toIds(idsOrDoc || document);
  // Fallback 1: jei nerasta DOM'e — bandome iš state.overlays
  let _ids = ids.slice();
  try {
    if (!_ids.length && typeof state !== 'undefined' && state && state.overlays && typeof state.overlays.keys === 'function') {
      _ids = Array.from(state.overlays.keys()).map(String).filter(Boolean);
    }
  } catch {}
  // Fallback 2: jei dar tuščia — bandome iš chart dataset'ų (overlay:<id>)
  try {
    if (!_ids.length && typeof getChart === 'function') {
      const ch = getChart();
      if (ch && ch.data && Array.isArray(ch.data.datasets)) {
        _ids = ch.data.datasets
          .map(d => (d && d.id && String(d.id).startsWith('overlay:') ? String(d.id).split(':')[1] : ''))
          .filter(Boolean);
      }
    }
  } catch {}
  if (!_ids.length) return enable('#');
  return enable(composeCsvUrl(_ids, { from_ms: (typeof state !== 'undefined' ? state.filters?.from_ms : ''), to_ms: (typeof state !== 'undefined' ? state.filters?.to_ms : '') }));

  const from = (typeof state !== 'undefined' ? state.filters?.from_ms : (range?.from_ms ?? ''));
  const to   = (typeof state !== 'undefined' ? state.filters?.to_ms   : (range?.to_ms   ?? ''));
  return enable(composeCsvUrl(ids, { from_ms: from, to_ms: to }));
}



if (typeof window !== 'undefined') {
  window.getActiveOverlayIds = getActiveOverlayIds;
  window.updateCsvLink = (...args) => updateCsvLink(...args);
}

export async function handleOverlayToggle(job, doc = document) {
  const id = job.id ?? job;
  const ids = getActiveOverlayIds(doc);
  if (state.overlays.has(String(id))) {
    removeOverlay(id);
    updateCsvLink(ids);
    return;
  }
  updateCsvLink(ids);
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
      updateCsvLink();
    });
  }
  fetchBaseline(doc);
  listJobs(doc);
  const refreshBtn = doc.querySelector('[data-jobs-refresh]');
  if (refreshBtn) refreshBtn.addEventListener('click', () => listJobs(doc));
  const autoChk = doc.querySelector('[data-jobs-auto]');
  const startAuto = () => { state.timers.jobs = setInterval(() => listJobs(doc), 30000); };
  const stopAuto = () => { clearInterval(state.timers.jobs); state.timers.jobs = null; };
  if (autoChk) autoChk.addEventListener('change', () => {
    if (autoChk.checked) startAuto(); else stopAuto();
  });
  doc.addEventListener('visibilitychange', () => {
    if (doc.hidden) {
      stopAuto();
    } else {
      listJobs(doc);
      if (autoChk?.checked) startAuto();
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
    updateCsvLink();
    const heading = doc.querySelector('#equityCard h2');
    if (heading) { heading.setAttribute('tabindex','-1'); heading.focus(); }
  });
  const btBtn = doc.querySelector('[data-backtest-quick]');
  if (btBtn) btBtn.addEventListener('click', async () => {
    try {
      const body = { symbol: state.filters.symbol, interval: state.filters.interval, params: {} };
      const headers = { 'Content-Type': 'application/json' };
      const token = getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
      const r = await fetch('/jobs/backtest', { method: 'POST', headers, body: JSON.stringify(body) });
      if (!r.ok) {
        let msg = ''; try { msg = (await r.json())?.message || ''; } catch {}
        throw new Error(`/jobs/backtest [${r.status}] ${msg}`.trim());
      }
      showToast('Backtest started', { doc });
      listJobs(doc);
    } catch (e) {
      showToast(`Backtest failed ${e.message || ''}`.trim(), { type: 'error', doc });
    }
  });
}

if (typeof window !== 'undefined' && !window.__DISABLE_AUTO_INIT__) {
  window.addEventListener('DOMContentLoaded', () => init());
}
