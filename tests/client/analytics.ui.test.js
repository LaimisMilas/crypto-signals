import fs from 'fs';
import { jest } from '@jest/globals';

const html = fs.readFileSync('client/public/analytics.html', 'utf8');
const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)[1].replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

function setupDom() {
  document.body.innerHTML = body + '<a id="csv-equity" href="#"></a><a id="csv-trades" href="#"></a><input name="strategy">';
  localStorage.clear();
  window.__DISABLE_AUTO_INIT__ = true;
  global.Chart = class { constructor(ctx,cfg){ this.ctx=ctx; this.data=cfg.data; this.options=cfg.options; this.update=jest.fn(); } };
}

function flush(){ return new Promise(r=>setTimeout(r,0)); }

function createJsonResponse(obj, status = 200){
  return new Response(JSON.stringify(obj), { status, headers:{'Content-Type':'application/json'} });
}

describe('analytics ui', () => {
  test('compose + apply builds query without empty strategy', async () => {
    setupDom();
    const baseline = { equity:[{ ts:1, equity:1 }], links:{} };
    global.fetch = jest.fn(url => {
      if (url.startsWith('/portfolio')) return Promise.resolve(createJsonResponse({}));
      return Promise.resolve(createJsonResponse(baseline));
    });
    jest.resetModules();
    const mod = await import('../../client/public/assets/analytics.js');
    mod.init(document);
    await flush();
    global.fetch.mockClear();
    document.querySelector('[name=symbol]').value = 'SOL';
    document.querySelector('[name=from]').value = '1970-01-01T00:00:01';
    document.querySelector('[name=to]').value = '1970-01-01T00:00:02';
    document.querySelector('[name=strategy]').value = '';
    document.querySelector('[data-apply]').click();
    await flush();
    const url = global.fetch.mock.calls[0][0];
    expect(url).toContain('symbol=SOL');
    expect(url).toContain('from_ms=1000');
    expect(url).toContain('to_ms=2000');
    expect(url).not.toContain('strategy=');
  });

  test('baseline dataset and csv links', async () => {
    setupDom();
    const baseline = { equity:[{ ts:1, equity:2 }, { ts:2, equity:3 }], links:{ equity:'/e.csv', trades:'/t.csv' } };
    global.fetch = jest.fn(url => {
      if (url.startsWith('/analytics?baseline=live')) return Promise.resolve(createJsonResponse(baseline));
      if (url.startsWith('/analytics/jobs')) return Promise.resolve(createJsonResponse([]));
      if (url.startsWith('/portfolio')) return Promise.resolve(createJsonResponse({}));
      return Promise.reject('unknown');
    });
    jest.resetModules();
    const mod = await import('../../client/public/assets/analytics.js');
    mod.init(document);
    await flush();
    const chart = mod.getChart();
    expect(chart.data.datasets.length).toBe(1);
    expect(chart.data.datasets[0].label).toBe('Baseline');
    expect(chart.data.datasets[0].data.map(p=>p.y)).toEqual([2,3]);
    expect(chart.update).toHaveBeenCalled();
    expect(document.getElementById('csv-equity').href).toContain('/e.csv');
    expect(document.getElementById('csv-trades').href).toContain('/t.csv');
  });

  test('reset clears filters', async () => {
    setupDom();
    const baseline = { equity:[], links:{} };
    global.fetch = jest.fn(url => {
      if (url.startsWith('/portfolio')) return Promise.resolve(createJsonResponse({}));
      return Promise.resolve(createJsonResponse(baseline));
    });
    jest.resetModules();
    const mod = await import('../../client/public/assets/analytics.js');
    mod.init(document);
    await flush();
    document.querySelector('[name=from]').value = '1970-01-01T00:00:01';
    document.querySelector('[name=to]').value = '1970-01-01T00:00:02';
    document.querySelector('[name=strategy]').value = 'A';
    document.querySelector('[data-reset]').click();
    await flush();
    expect(document.querySelector('[name=from]').value).toBe('');
    expect(document.querySelector('[name=to]').value).toBe('');
    expect(document.querySelector('[name=strategy]').value).toBe('');
  });

  test('overlay add and remove', async () => {
    setupDom();
    const baseline = { equity:[{ ts:1, equity:2 }], links:{} };
    const jobs = [{ id:7 }];
    const overlay = { equity:[{ ts:2, equity:3 }] };
    global.fetch = jest.fn(url => {
      if (url.startsWith('/analytics?baseline=live')) return Promise.resolve(createJsonResponse(baseline));
      if (url.startsWith('/analytics/jobs')) return Promise.resolve(createJsonResponse(jobs));
      if (url === '/analytics/job/7/equity') return Promise.resolve(createJsonResponse(overlay));
      if (url.startsWith('/portfolio')) return Promise.resolve(createJsonResponse({}));
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
    expect(chart.data.datasets[1].label).toBe('Overlay: 7');
    expect(document.querySelector('[data-export-csv]').getAttribute('href')).toContain('ids=7');
    expect(document.querySelector('[data-export-csv]').classList.contains('is-disabled')).toBe(false);
    cb.checked = false; cb.dispatchEvent(new Event('change'));
    await flush();
    expect(chart.data.datasets.length).toBe(1);
    expect(chart.data.datasets[0].label).toBe('Baseline');
    expect(document.querySelector('[data-export-csv]').getAttribute('href')).toBe('#');
    expect(document.querySelector('[data-export-csv]').classList.contains('is-disabled')).toBe(true);
  });

  test('error 500 shows toast', async () => {
    setupDom();
    global.fetch = jest.fn(url => {
      if (url.startsWith('/portfolio')) return Promise.resolve(createJsonResponse({}));
      return Promise.resolve(new Response('',{ status:500 }));
    });
    jest.resetModules();
    const mod = await import('../../client/public/assets/analytics.js');
    mod.init(document);
    await flush();
    const msg = document.querySelector('.toast.error').textContent;
    expect(msg).toContain('/analytics?baseline=live');
    expect(msg).toContain('[500]');
  });

  test('empty data handled', async () => {
    setupDom();
    const baseline = { equity:[], links:{} };
    global.fetch = jest.fn(url => {
      if (url.startsWith('/analytics?baseline=live')) return Promise.resolve(createJsonResponse(baseline));
      if (url.startsWith('/analytics/jobs')) return Promise.resolve(createJsonResponse([]));
      if (url.startsWith('/portfolio')) return Promise.resolve(createJsonResponse({}));
      return Promise.reject('u');
    });
    jest.resetModules();
    const mod = await import('../../client/public/assets/analytics.js');
    mod.init(document);
    await flush();
    const chart = mod.getChart();
    expect(chart.data.datasets[0].data.length).toBe(0);
    expect(document.getElementById('csv-equity').getAttribute('href')).toBe('#');
  });

  test('corrupt json shows toast', async () => {
    setupDom();
    const bad = { equity:null };
    global.fetch = jest.fn(url => {
      if (url.startsWith('/analytics?baseline=live')) return Promise.resolve(createJsonResponse(bad));
      if (url.startsWith('/analytics/jobs')) return Promise.resolve(createJsonResponse([]));
      if (url.startsWith('/portfolio')) return Promise.resolve(createJsonResponse({}));
      return Promise.reject('u');
    });
    jest.resetModules();
    const mod = await import('../../client/public/assets/analytics.js');
    mod.init(document);
    await flush();
    expect(document.querySelector('.toast.error')).toBeTruthy();
  });

  test('overlay fetch error', async () => {
    setupDom();
    const baseline = { equity:[{ ts:1, equity:2 }], links:{} };
    const jobs = [{ id:5 }];
    global.fetch = jest.fn(url => {
      if (url.startsWith('/analytics?baseline=live')) return Promise.resolve(createJsonResponse(baseline));
      if (url.startsWith('/analytics/jobs')) return Promise.resolve(createJsonResponse(jobs));
      if (url === '/analytics/job/5/equity') return Promise.resolve(new Response('',{ status:404 }));
      if (url.startsWith('/portfolio')) return Promise.resolve(createJsonResponse({}));
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
    expect(chart.data.datasets.length).toBe(1);
    expect(document.querySelector('.toast.error')).toBeTruthy();
  });

  test('duplicate overlay dedupes', async () => {
    setupDom();
    const baseline = { equity:[{ ts:1, equity:2 }], links:{} };
    const jobs = [{ id:7 }];
    const overlay = { equity:[{ ts:2, equity:3 }] };
    global.fetch = jest.fn(url => {
      if (url.startsWith('/analytics?baseline=live')) return Promise.resolve(createJsonResponse(baseline));
      if (url.startsWith('/analytics/jobs')) return Promise.resolve(createJsonResponse(jobs));
      if (url === '/analytics/job/7/equity') return Promise.resolve(createJsonResponse(overlay));
      if (url.startsWith('/portfolio')) return Promise.resolve(createJsonResponse({}));
      return Promise.reject('u');
    });
    jest.resetModules();
    const mod = await import('../../client/public/assets/analytics.js');
    mod.init(document);
    await flush();
    await mod.fetchOverlay(7, 'Overlay: 7', document);
    await mod.fetchOverlay(7, 'Overlay: 7', document);
    const chart = mod.getChart();
    expect(chart.data.datasets.filter(d=>d.id.startsWith('overlay')).length).toBe(1);
  });

  test('jobs auto-refresh stops hidden and resumes', async () => {
    jest.useFakeTimers();
    setupDom();
    const baseline = { equity:[], links:{} };
    let jobsCalls = 0;
    global.fetch = jest.fn(url => {
      if (url.startsWith('/analytics?baseline=live')) return Promise.resolve(createJsonResponse(baseline));
      if (url.startsWith('/analytics/jobs')) { jobsCalls++; return Promise.resolve(createJsonResponse([])); }
      if (url.startsWith('/portfolio')) return Promise.resolve(createJsonResponse({}));
      return Promise.reject('u');
    });
    jest.resetModules();
    const mod = await import('../../client/public/assets/analytics.js');
    mod.init(document);
    await Promise.resolve();
    const auto = document.querySelector('[data-jobs-auto]');
    auto.checked = true; auto.dispatchEvent(new Event('change'));
    jest.advanceTimersByTime(30000);
    await Promise.resolve();
    const beforeHide = jobsCalls;
    Object.defineProperty(document, 'hidden', { configurable:true, value:true });
    document.dispatchEvent(new Event('visibilitychange'));
    jest.advanceTimersByTime(60000);
    await Promise.resolve();
    expect(jobsCalls).toBe(beforeHide);
    Object.defineProperty(document, 'hidden', { configurable:true, value:false });
    document.dispatchEvent(new Event('visibilitychange'));
    await Promise.resolve();
    const afterShow = jobsCalls;
    jest.advanceTimersByTime(30000);
    await Promise.resolve();
    expect(jobsCalls).toBe(afterShow + 1);
    jest.useRealTimers();
  });

  test('portfolio fallback when empty', async () => {
    setupDom();
    const baseline = { equity:[], links:{} };
    global.fetch = jest.fn(url => {
      if (url.startsWith('/analytics?baseline=live')) return Promise.resolve(createJsonResponse(baseline));
      if (url.startsWith('/analytics/jobs')) return Promise.resolve(createJsonResponse([]));
      if (url.startsWith('/portfolio')) return Promise.resolve(new Response('', { status:204 }));
      return Promise.reject('u');
    });
    jest.resetModules();
    const mod = await import('../../client/public/assets/analytics.js');
    mod.init(document);
    await flush();
    expect(document.querySelector('[data-portfolio]').textContent).toBe('No portfolio data');
  });
});
