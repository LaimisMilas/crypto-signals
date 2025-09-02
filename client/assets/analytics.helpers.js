export function composeAnalyticsQuery(filters = {}) {
  const q = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v === '' || v === undefined || v === null) return;
    q.set(k, v);
  });
  return q.toString();
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
  if (!ids.length) return '#';
  const q = new URLSearchParams();
  q.set('ids', ids.join(','));
  if (range.from_ms) q.set('from_ms', range.from_ms);
  if (range.to_ms) q.set('to_ms', range.to_ms);
  return `/analytics/overlays.csv?${q.toString()}`;
}
