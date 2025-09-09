export function composeAnalyticsQuery(filters) {
  const p = new URLSearchParams();
  p.set('baseline', 'live');
  if (filters.symbol) p.set('symbol', filters.symbol);
  if (filters.interval) p.set('interval', filters.interval);

  // svarbu: ds=none => n=0; lttb => n perduodamas jei yra
  if (filters.ds === 'none') {
    p.set('ds', 'none');
    const n = (filters.n == null || String(filters.n).trim() === '') ? 0 : Number(filters.n);
    p.set('n', String(n));
  } else if (filters.ds === 'lttb') {
    p.set('ds', 'lttb');
    if (filters.n != null) p.set('n', String(filters.n));
  }

  if (filters.from_ms != null && String(filters.from_ms).length) p.set('from_ms', String(filters.from_ms));
  if (filters.to_ms != null && String(filters.to_ms).length) p.set('to_ms', String(filters.to_ms));
  return `/analytics?${p.toString()}`;
}

export function normalizeEquity(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    const ts = Number(item.ts ?? item.ms);
    const eq = Number(item.equity);
    if (!Number.isFinite(ts) || !Number.isFinite(eq)) continue;
    out.push({ ts, equity: eq });
  }
  out.sort((a, b) => a.ts - b.ts);
  return out;
}

export function overlayLabel(jobOrId) {
  const id = typeof jobOrId === 'object' ? jobOrId?.id ?? '' : jobOrId;
  return `Overlay: ${id}`;
}

export function composeCsvUrl(ids = [], range = {}) {
  const toArray = (v) => {
    if (Array.isArray(v)) return v;
    if (v == null) return [];
    if (typeof v === 'string') return v ? v.split(',') : [];
    if (typeof v === 'object') {
      if (v && (v.nodeType === 1 || v.nodeType === 9)) return []; // element/document
      if (typeof v[Symbol.iterator] === 'function') return Array.from(v);
      if (typeof v.length === 'number') { try { return Array.from(v); } catch { return []; } }
    }
    return [String(v)];
  };
  const arr = toArray(ids).map(String).filter(Boolean);
  if (arr.length === 0) return '#';

  const params = new URLSearchParams();
  params.set('ids', arr.join(','));

  const from = (range && range.from_ms != null && String(range.from_ms).length) ? String(range.from_ms) : '';
  const to = (range && range.to_ms != null && String(range.to_ms).length) ? String(range.to_ms) : '';
  if (from) params.set('from_ms', from);
  if (to) params.set('to_ms', to);

  return `/analytics/overlays.csv?${params.toString()}`;
}

