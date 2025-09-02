import fs from 'fs';
import { jest } from '@jest/globals';

const html = fs.readFileSync('client/public/analytics.html', 'utf8');
const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)[1].replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

function setupDom() {
  document.body.innerHTML = body;
  localStorage.clear();
  window.__DISABLE_AUTO_INIT__ = true;
  global.Chart = class {
    constructor(ctx, cfg){ this.ctx=ctx; this.data=cfg.data; this.options=cfg.options; this.update=jest.fn(); }
  };
}

function flush() { return new Promise(r => setTimeout(r, 0)); }

describe('analytics ui', () => {
  test('smoke', () => {
    setupDom();
    expect(document.querySelector('fieldset.filters')).toBeTruthy();
    expect(document.querySelector('[data-equity]')).toBeTruthy();
    expect(document.querySelector('[data-jobs-table]')).toBeTruthy();
  });

  test('compose query', async () => {
    const mod = await import('../../client/public/assets/analytics.js');
    const q = mod.composeAnalyticsQuery({ symbol:'SOL', interval:'1h', from_ms:1, to_ms:2, ds:'lttb', n:10 });
    expect(q).toContain('symbol=SOL');
    expect(q).toContain('interval=1h');
    expect(q).toContain('n=10');
  });

  test('normalize and overlay label', async () => {
    const mod = await import('../../client/public/assets/analytics.js');
    const series = mod.normalizeEquity([{ts:2,equity:'2'},{ts:1,equity:'1'}]);
    expect(series[0].x).toBe(1);
    expect(series[1].y).toBe(2);
    expect(mod.overlayLabel({id:5,strategy:'s'})).toBe('5:s');
  });

  test('baseline dataset added', async () => {
    setupDom();
    const baseline = [{ ts:1, equity:2 }];
    const jobs = [{ id:42, strategy:'str' }];
    global.fetch = jest.fn(url => {
      if (url.startsWith('/analytics?baseline=live')) return Promise.resolve(new Response(JSON.stringify(baseline)));
      if (url.startsWith('/analytics/jobs')) return Promise.resolve(new Response(JSON.stringify(jobs)));
      return Promise.reject('u');
    });
    jest.resetModules();
    const mod = await import('../../client/public/assets/analytics.js');
    mod.init(document);
    await flush();
    const chart = mod.getChart();
    expect(chart.data.datasets.find(d=>d.id==='baseline')).toBeTruthy();
  });

  test('overlay add/remove and csv link', async () => {
    setupDom();
    const baseline = [{ ts:1, equity:2 }];
    const jobs = [{ id:7, strategy:'A' }];
    const overlay = [{ ts:2, equity:3 }];
    global.fetch = jest.fn(url => {
      if (url.startsWith('/analytics?baseline=live')) return Promise.resolve(new Response(JSON.stringify(baseline)));
      if (url.startsWith('/analytics/jobs')) return Promise.resolve(new Response(JSON.stringify(jobs)));
      if (url === '/analytics/job/7/equity') return Promise.resolve(new Response(JSON.stringify(overlay)));
      return Promise.reject('u');
    });
    jest.resetModules();
    const mod = await import('../../client/public/assets/analytics.js');
    mod.init(document);
    await flush();
    const cb = document.querySelector('[data-overlays-list] input');
    cb.checked = true; cb.dispatchEvent(new Event('change'));
    await flush();
    const chart = mod.getChart();
    expect(chart.data.datasets.length).toBe(2);
    expect(chart.data.datasets[1].label).toBe('7:A');
    const link = document.querySelector('[data-export-csv]');
    expect(link.href).toContain('ids=7');
    cb.checked = false; cb.dispatchEvent(new Event('change'));
    await flush();
    expect(chart.data.datasets.length).toBe(1);
    expect(link.href.endsWith('#')).toBe(true);
  });

  test('filters persisted and loaded from localStorage', async () => {
    setupDom();
    localStorage.setItem('analyticsFilters', JSON.stringify({ symbol:'BTCUSDT', interval:'5m', from_ms:'1', to_ms:'2', ds:'lttb', n:5 }));
    const baseline = [{ ts:1, equity:2 }];
    const jobs = [];
    global.fetch = jest.fn(url => {
      if (url.startsWith('/analytics?baseline=live')) return Promise.resolve(new Response(JSON.stringify(baseline)));
      if (url.startsWith('/analytics/jobs')) return Promise.resolve(new Response(JSON.stringify(jobs)));
      return Promise.reject('u');
    });
    jest.resetModules();
    const mod = await import('../../client/public/assets/analytics.js');
    const setSpy = jest.spyOn(Storage.prototype, 'setItem');
    mod.init(document);
    await flush();
    expect(document.querySelector('[name=symbol]').value).toBe('BTCUSDT');
    document.querySelector('[name=interval]').value = '15m';
    document.querySelector('[data-apply]').click();
    await flush();
    expect(setSpy).toHaveBeenCalled();
    setSpy.mockRestore();
  });

  test('legend click toggles visibility only', async () => {
    setupDom();
    const baseline = [{ ts:1, equity:2 }];
    const jobs = [{ id:7, strategy:'A' }];
    const overlay = [{ ts:2, equity:3 }];
    global.fetch = jest.fn(url => {
      if (url.startsWith('/analytics?baseline=live')) return Promise.resolve(new Response(JSON.stringify(baseline)));
      if (url.startsWith('/analytics/jobs')) return Promise.resolve(new Response(JSON.stringify(jobs)));
      if (url === '/analytics/job/7/equity') return Promise.resolve(new Response(JSON.stringify(overlay)));
      return Promise.reject('u');
    });
    jest.resetModules();
    const mod = await import('../../client/public/assets/analytics.js');
    mod.init(document);
    await flush();
    const cb = document.querySelector('[data-overlays-list] input');
    cb.checked = true; cb.dispatchEvent(new Event('change'));
    await flush();
    const chart = mod.getChart();
    const link = document.querySelector('[data-export-csv]');
    const handler = chart.options.plugins.legend.onClick;
    handler({}, { datasetIndex:1 }, { chart });
    expect(chart.data.datasets[1].hidden).toBe(true);
    expect(link.href).toContain('ids=7');
    handler({}, { datasetIndex:1 }, { chart });
    expect(chart.data.datasets[1].hidden).toBe(false);
    expect(link.href).toContain('ids=7');
  });

  test('error toast on API error', async () => {
    setupDom();
    global.fetch = jest.fn(() => Promise.resolve(new Response('',{ status:500 })));
    jest.resetModules();
    const mod = await import('../../client/public/assets/analytics.js');
    mod.init(document);
    await flush();
    const toastHost = document.getElementById('toasts');
    expect(toastHost.textContent).toMatch(/Failed to load baseline/);
  });
});
