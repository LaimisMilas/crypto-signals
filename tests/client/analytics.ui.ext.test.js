import fs from 'fs';
import { jest } from '@jest/globals';

const html = fs.readFileSync('client/public/analytics.html', 'utf8');
const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)[1].replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

function setupDom(){
  document.body.innerHTML = body + '<a id="csv-equity" href="#"></a><a id="csv-trades" href="#"></a>'; // analytics.html already has data-export-csv link
  localStorage.clear();
  window.__DISABLE_AUTO_INIT__ = true;
  global.Chart = class { constructor(ctx,cfg){ this.ctx=ctx; this.data=cfg.data; this.options=cfg.options; this.update=jest.fn(); } };
}

function flush(){ return new Promise(r=>setTimeout(r,0)); }

function createJsonResponse(obj, status=200){
  return new Response(JSON.stringify(obj), {status, headers:{'Content-Type':'application/json'}});
}

describe('analytics ui ext', () => {
  test('apply uses non-empty params', async () => {
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
    global.fetch.mockClear();
    document.querySelector('[name=from]').value = '1970-01-01T00:00:01';
    document.querySelector('[name=to]').value = '1970-01-01T00:00:02';
    document.querySelector('[name=ds]').value = 'none';
    document.querySelector('[name=n]').value = '500';
    document.querySelector('[data-apply]').click();
    await flush();
    const url = global.fetch.mock.calls[0][0];
    expect(url).toContain('from_ms=1000');
    expect(url).toContain('to_ms=2000');
    expect(url).toContain('ds=none');
    expect(url).toContain('n=500');
    expect(url).not.toContain('strategy=');
  });

  test('reset clears ds and n', async () => {
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
    document.querySelector('[name=ds]').value = 'none';
    document.querySelector('[name=n]').value = '10';
    document.querySelector('[name=from]').value = '1970-01-01T00:00:01';
    document.querySelector('[name=to]').value = '1970-01-01T00:00:02';
    document.querySelector('[data-reset]').click();
    await flush();
    expect(document.querySelector('[name=ds]').value).toBe('lttb');
    expect(document.querySelector('[name=n]').value).toBe('1000');
    expect(document.querySelector('[name=from]').value).toBe('');
    expect(document.querySelector('[name=to]').value).toBe('');
  });

  test('updateCsvLink builds href with overlay ids and range', async () => {
    setupDom();
    const baseline = { equity:[], links:{} };
    global.fetch = jest.fn(url => {
      if (url.startsWith('/analytics?baseline=live')) return Promise.resolve(createJsonResponse(baseline));
      if (url.startsWith('/analytics/jobs')) return Promise.resolve(createJsonResponse([]));
      if (url.startsWith('/portfolio')) return Promise.resolve(createJsonResponse({}));
      return Promise.reject('u');
    });
    jest.resetModules();
    const helpers = await import('../../client/assets/analytics.helpers.js');
    const mod = await import('../../client/public/assets/analytics.js');
    mod.init(document);
    await flush();
    document.querySelector('[name=from]').value = '1970-01-01T00:00:01';
    document.querySelector('[name=to]').value = '1970-01-01T00:00:02';
    document.querySelector('[data-apply]').click();
    await flush();
    const host = document.querySelector('[data-overlays-list]');
    host.innerHTML = '<label><input type="checkbox" data-overlay-id="7" checked></label><label><input type="checkbox" data-overlay-id="8" checked></label>';
    mod.upsertOverlay('7', [{ ts:1, equity:2 }], 'A');
    mod.upsertOverlay('8', [{ ts:1, equity:3 }], 'B');
    mod.updateCsvLink();
    const href = document.querySelector('[data-export-csv]').getAttribute('href');
    const expected = helpers.composeCsvUrl(['7','8'], { from_ms:'1000', to_ms:'2000' });
    expect(href).toBe(expected);
  });
});
