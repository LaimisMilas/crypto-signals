import { jest } from '@jest/globals';

function json(obj, status=200){ return new Response(JSON.stringify(obj), { status, headers:{'Content-Type':'application/json'} }); }
function flush(){ return new Promise(r=>setTimeout(r,0)); }

describe('analytics overlays ui events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    document.body.innerHTML='';
    delete global.fetch;
    delete global.Toast;
  });

  test('queue topN backtest via UI', async () => {
    global.Toast = { open: jest.fn(), close: jest.fn() };
    global.EventSource = class { constructor(){ this.close=jest.fn(); } };
    const fetchMock = jest.fn(url => {
      if (url.startsWith('/analytics/optimize/123/top')) return Promise.resolve(json({ top:[{ cagr:1, a:2 }] }));
      if (url === '/jobs') return Promise.resolve(json({ id:5 }));
      if (url.startsWith('/analytics/jobs')) return Promise.resolve(json({ jobs:[] }));
      return Promise.resolve(json({}));
    });
    global.fetch = fetchMock;
    const { mount } = await import('../../client/public/assets/modules/analytics/overlays.js');
    const root = document.createElement('div');
    await mount(root);
    root.querySelector('#ov-top-id').value = '123';
    root.querySelector('#ov-top-load').click();
    await flush();
    const btn = root.querySelector('#ov-top-results button[data-idx="0"]');
    btn.click();
    await flush();
    expect(fetchMock).toHaveBeenCalledWith('/jobs', expect.any(Object));
  });
});
