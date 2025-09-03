import 'whatwg-fetch';
import 'jest-canvas-mock';
import { jest } from '@jest/globals';

let Analytics;
let Helpers;

const flush = () => new Promise(r => setTimeout(r, 0));
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers:{ 'Content-Type':'application/json' } });

async function mount(fetchImpl){
  document.body.innerHTML = `
    <section id="overlays-card">
      <div data-overlays-list></div>
      <a data-export-csv href="#" data-testid="csv"></a>
      <fieldset>
        <input name="symbol" value="SOLUSDT"/>
        <input name="interval" value="1m"/>
        <input name="from" value="2025-08-01"/>
        <input name="to" value="2025-08-31"/>
        <select name="ds"><option value="lttb" selected>lttb</option></select>
        <input name="n" type="number" value="1000"/>
        <button type="button" data-apply>Apply</button>
        <button type="button" data-reset>Reset</button>
      </fieldset>
    </section>
    <div id="toasts"></div>
    <canvas data-equity></canvas>
  `;
  global.Chart = class { constructor(){ this.data={ datasets:[] }; this.update = jest.fn(); this.toBase64Image = jest.fn(()=>"img"); } };
  global.fetch = fetchImpl;
  Analytics = await import('../../client/public/assets/analytics.js');
  Helpers = await import('../../client/assets/analytics.helpers.js');
  Analytics.init(document);
  await flush();
}

describe('analytics overlays – extra branches', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();
    const fetchImpl = jest.fn(url => {
      if (url.startsWith('/analytics?baseline=live')) return Promise.resolve(json({ equity:[{ ts:1, equity:100 }], links:{} }));
      if (url.startsWith('/analytics/jobs')) return Promise.resolve(json([]));
      return Promise.resolve(json({}));
    });
    await mount(fetchImpl);
  });

  test('dedupe: second add with same id replaces instead of duplicating', () => {
    Analytics.upsertOverlay('job-x', [{ ts:1, equity:111 }], 'Overlay: job-x');
    const before = Analytics.getChart().data.datasets.length;
    Analytics.upsertOverlay('job-x', [{ ts:2, equity:123 }], 'Overlay: job-x');
    const after = Analytics.getChart().data.datasets.length;
    expect(after).toBe(before);
    const last = Analytics.getChart().data.datasets.find(d => d.label?.includes('job-x'));
    expect(last.data.at(-1).y).toBe(123);
  });

  test('remove non-existent is no-op; remove existing works', () => {
    Analytics.removeOverlay('missing');
    expect(Analytics.getChart().data.datasets.length).toBe(1);
    Analytics.upsertOverlay('job-y', [{ ts:3, equity:130 }], 'Overlay: job-y');
    expect(Analytics.getChart().data.datasets.length).toBe(2);
    Analytics.removeOverlay('job-y');
    expect(Analytics.getChart().data.datasets.length).toBe(1);
  });

  test('update CSV with two overlays and full range sets correct href', () => {
    Analytics.upsertOverlay('a', [{ ts:1, equity:101 }], 'Overlay: a');
    Analytics.upsertOverlay('b', [{ ts:2, equity:102 }], 'Overlay: b');
    Analytics.updateCsvLink(document);
    const expected = Helpers.composeCsvUrl(['a','b'], { from_ms:'', to_ms:'', ds:'lttb', n:1000 });
    expect(document.querySelector('[data-export-csv]').getAttribute('href')).toBe(expected);
  });

  test('fetch overlay error branches: 500/404, bad JSON, network error', async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(json({ equity:[{ ts:1, equity:100 }], links:{} })) // baseline
      .mockResolvedValueOnce(json([])) // jobs
      .mockResolvedValueOnce(new Response('x', { status:500 }))
      .mockResolvedValueOnce(new Response('x', { status:404 }))
      .mockResolvedValueOnce(json({ equity:null }))
      .mockRejectedValueOnce(new Error('net'));
    await mount(fetchMock);

    await Analytics.fetchOverlay('o-500', 'O-500', document);
    await Analytics.fetchOverlay('o-404', 'O-404', document);
    await Analytics.fetchOverlay('o-bad', 'O-BAD', document);
    await Analytics.fetchOverlay('o-net', 'O-NET', document);
    expect(Analytics.getChart().data.datasets.length).toBe(1);
    expect(document.querySelector('.toast.error')).toBeTruthy();
  });

  test('overlays form: data-reset clears fields to defaults', async () => {
    global.fetch = jest.fn(url => {
      if (url.startsWith('/analytics?baseline=live')) return Promise.resolve(new Response(JSON.stringify({ equity:[], links:{} }), { headers:{'Content-Type':'application/json'} }));
      if (url.startsWith('/analytics/jobs')) return Promise.resolve(new Response(JSON.stringify([]), { headers:{'Content-Type':'application/json'} }));
      return Promise.resolve(new Response(JSON.stringify({}), { headers:{'Content-Type':'application/json'} }));
    });
    Analytics.init(document);
    await flush();
    document.querySelector('[data-reset]').click();
    const from = document.querySelector('input[name="from"]');
    expect(from.value === '' || from.value === '1970-01-01').toBeTruthy();
  });
});
