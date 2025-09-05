export function composeCsvUrl(ids = [], range = {}) {
  const params = new URLSearchParams();
  if (ids && ids.length) params.set('ids', ids.join(','));
  if (range.from_ms != null && String(range.from_ms).length) params.set('from_ms', String(range.from_ms));
  if (range.to_ms   != null && String(range.to_ms).length)   params.set('to_ms',   String(range.to_ms));
  const qs = params.toString();
  return `/analytics/overlays.csv${qs ? `?${qs}` : ''}`;
}

export function composeAnalyticsQuery(filters) {
  const p = new URLSearchParams();
  p.set('baseline', 'live');
  if (filters.symbol)   p.set('symbol', filters.symbol);
  if (filters.interval) p.set('interval', filters.interval);

  if (filters.ds === 'none') {
    p.set('ds', 'none');
    const n = (filters.n == null || String(filters.n).trim() === '') ? 0 : Number(filters.n);
    p.set('n', String(n));
  } else if (filters.ds === 'lttb') {
    p.set('ds', 'lttb');
    if (filters.n != null) p.set('n', String(filters.n));
  }

  if (filters.from_ms != null && String(filters.from_ms).length) p.set('from_ms', String(filters.from_ms));
  if (filters.to_ms   != null && String(filters.to_ms).length)   p.set('to_ms',   String(filters.to_ms));
  return `/analytics?${p.toString()}`;
}
