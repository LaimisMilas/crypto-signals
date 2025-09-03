import { jest } from '@jest/globals';

function createJsonResponse(obj, status = 200){
  return new Response(JSON.stringify(obj), { status, headers:{'Content-Type':'application/json'} });
}

function flush(){ return new Promise(r=>setTimeout(r,0)); }

function setupDom(){
  document.body.innerHTML = `
    <div id="toasts"></div>
    <input name="symbol" value="SOLUSDT">
    <input name="interval" value="1m">
    <input name="from">
    <input name="to">
    <input name="strategy">
    <input name="ds" value="lttb">
    <input name="n" value="1000">
    <button data-apply></button>
    <button data-reset></button>
    <canvas data-equity></canvas>
    <div data-overlays-list></div>
    <a data-export-csv></a>
    <a id="csv-equity"></a>
    <a id="csv-trades"></a>
  `;
  window.__DISABLE_AUTO_INIT__ = true;
  global.Chart = class { constructor(){ this.data={ datasets: [] }; this.update=jest.fn(); this.toBase64Image=jest.fn(()=>"img"); } };
}

describe('analytics overlays extra branches', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '';
    delete global.fetch;
    delete global.Chart;
  });

  test('upsert, dedupe, remove overlays', async () => {
    setupDom();
    const baseline = { equity:[{ ts:1, equity:1 }], links:{} };
    const overlay = { equity:[{ ts:2, equity:3 }] };
    global.fetch = jest.fn(url => {
      if (url.startsWith('/analytics?baseline=live')) return Promise.resolve(createJsonResponse(baseline));
      if (url.startsWith('/analytics/jobs')) return Promise.resolve(createJsonResponse([]));
      if (url === '/analytics/job/1/equity') return Promise.resolve(createJsonResponse(overlay));
      return Promise.reject('unknown');
    });
    const mod = await import('../../client/public/assets/analytics.js');
    mod.init(document);
    await flush();
    await mod.fetchOverlay(1, 'job-1', document);
    await flush();
    let chart = mod.getChart();
    expect(chart.data.datasets.length).toBe(2);
    // duplicate overlay
    await mod.fetchOverlay(1, 'job-1', document);
    expect(chart.data.datasets.filter(d=>d.id==='overlay-1').length).toBe(1);
    // remove
    mod.removeOverlay(1);
    expect(chart.data.datasets.find(d=>d.id==='overlay-1')).toBeUndefined();
  });

  test('fetchOverlay errors and bad payload', async () => {
    setupDom();
    const baseline = { equity:[{ ts:1, equity:1 }], links:{} };
    const jobs = [];
    let calls = 0;
    global.fetch = jest.fn(url => {
      if (url.startsWith('/analytics?baseline=live')) return Promise.resolve(createJsonResponse(baseline));
      if (url.startsWith('/analytics/jobs')) return Promise.resolve(createJsonResponse(jobs));
      if (url === '/analytics/job/2/equity'){
        calls++; if (calls===1) return Promise.resolve(new Response('',{status:404}));
        return Promise.resolve(createJsonResponse({ equity:null }));
      }
      return Promise.reject('u');
    });
    const mod = await import('../../client/public/assets/analytics.js');
    mod.init(document);
    await flush();
    await mod.fetchOverlay(2, 'bad', document);
    await flush();
    expect(document.querySelector('.toast.error')).toBeTruthy();
    await mod.fetchOverlay(2, 'bad', document);
    await flush();
    // still only baseline dataset
    const chart = mod.getChart();
    expect(chart.data.datasets.length).toBe(1);
  });

  test('updateCsvLink builds href from filters', async () => {
    setupDom();
    const baseline = { equity:[{ ts:1, equity:1 }], links:{} };
    const overlay = { equity:[{ ts:2, equity:3 }] };
    const helpers = await import('../../client/assets/analytics.helpers.js');
    global.fetch = jest.fn(url => {
      if (url.startsWith('/analytics?baseline=live')) return Promise.resolve(createJsonResponse(baseline));
      if (url.startsWith('/analytics/jobs')) return Promise.resolve(createJsonResponse([]));
      if (url === '/analytics/job/3/equity') return Promise.resolve(createJsonResponse(overlay));
      return Promise.reject('u');
    });
    const mod = await import('../../client/public/assets/analytics.js');
    mod.init(document);
    await flush();
    await mod.fetchOverlay(3, 'job-3', document);
    document.querySelector('[name=from]').value = '10';
    document.querySelector('[name=to]').value = '20';
    document.querySelector('[data-apply]').click();
    await flush();
    mod.updateCsvLink(document);
    const href = document.querySelector('[data-export-csv]').getAttribute('href');
    const expected = helpers.composeCsvUrl(['3'], { from_ms:'10', to_ms:'20' });
    expect(href).toBe(expected);
  });
});
