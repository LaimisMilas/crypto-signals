import client from 'prom-client';

export const rumFcp = new client.Histogram({ name: 'rum_fcp_seconds', help: 'FCP', buckets: [0.5, 1, 2, 3, 5, 8] });
export const rumLcp = new client.Histogram({ name: 'rum_lcp_seconds', help: 'LCP', buckets: [1, 2, 3, 5, 8, 13] });
export const rumTTFB = new client.Histogram({ name: 'rum_navigation_ttfb_seconds', help: 'TTFB', buckets: [0.1, 0.3, 0.6, 1, 2, 3] });
export const rumLongtasks = new client.Counter({ name: 'rum_longtasks_total', help: 'Long tasks total' });
export const rumLongtaskMax = new client.Gauge({ name: 'rum_longtask_max_ms', help: 'Max long task ms' });

export const rumSseReconnects = new client.Counter({ name: 'rum_sse_reconnect_attempts_total', help: 'SSE reconnect attempts', labelNames: ['clientType'] });
export const rumSseConnected = new client.Counter({ name: 'rum_sse_connected_seconds_total', help: 'SSE connected seconds', labelNames: ['clientType'] });
