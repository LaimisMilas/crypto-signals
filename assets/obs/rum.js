function send(payload, path = '/rum/metrics') {
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
  if (!(navigator.sendBeacon && navigator.sendBeacon(path, blob))) {
    fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  }
}

export function initRUM() {
  const perf = performance;
  const nav = perf.getEntriesByType('navigation')[0];
  if (nav) {
    send({ ttfb: nav.responseStart / 1000, dcl: nav.domContentLoadedEventEnd / 1000, load: nav.loadEventEnd / 1000, type: 'navigation' });
  }

  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      if (e.name === 'first-contentful-paint') send({ fcp: e.startTime / 1000, type: 'paint' });
      if (e.name === 'largest-contentful-paint') send({ lcp: e.startTime / 1000, type: 'paint' });
    }
  }).observe({ type: 'paint', buffered: true });

  new PerformanceObserver((list) => {
    const items = list.getEntries();
    send({ longtasks: items.length, longtaskMaxMs: Math.max(0, ...items.map(i => i.duration)), type: 'longtask' });
  }).observe({ type: 'longtask', buffered: true });
}
