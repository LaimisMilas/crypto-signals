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
    delete navigator.clipboard;
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

  test('shareUrl error branch shows toast', async () => {
    global.Toast = { open: jest.fn(), close: jest.fn() };
    global.EventSource = class { constructor(){ this.close=jest.fn(); } };
    navigator.clipboard = { writeText: jest.fn() };
    const fetchMock = jest.fn(url => {
      if (url.startsWith('/analytics/overlay-sets')) return Promise.resolve(json({ sets:[] }));
      if (url.startsWith('/analytics/jobs')) return Promise.resolve(json({ jobs:[{id:1}] }));
      if (url.startsWith('/analytics?overlay_job_ids=1')) return Promise.resolve(json({ overlayEquities:[{jobId:1,equity:[{ts:1,equity:1}]}], overlayStatsByJobId:{}, baseline:null }));
      if (url === '/analytics/overlays/share') return Promise.reject(new Error('fail'));
      return Promise.resolve(json({}));
    });
    global.fetch = fetchMock;
    const { mount } = await import('../../client/public/assets/modules/analytics/overlays.js');
    const root = document.createElement('div');
    await mount(root);
    root.querySelector('#ov-load').click();
    await flush();
    const cb = root.querySelector('#ov-jobs input[data-id="1"]');
    cb.checked = true; cb.dispatchEvent(new Event('change'));
    root.querySelector('#ov-share').click();
    await flush();
    expect(global.Toast.open).toHaveBeenCalledWith(expect.objectContaining({ title:'Share failed', variant:'error' }));
  });

  test('loadTopN missing id warns and fetch error shows toast', async () => {
    global.Toast = { open: jest.fn(), close: jest.fn() };
    global.EventSource = class { constructor(){ this.close=jest.fn(); } };
    const fetchMock = jest.fn(url => {
      if (url.startsWith('/analytics/overlay-sets')) return Promise.resolve(json({ sets:[] }));
      if (url.startsWith('/analytics/jobs')) return Promise.resolve(json({ jobs:[] }));
      return Promise.reject(new Error('boom'));
    });
    global.fetch = fetchMock;
    const { mount } = await import('../../client/public/assets/modules/analytics/overlays.js');
    const root = document.createElement('div');
    await mount(root);
    root.querySelector('#ov-top-load').click();
    expect(global.Toast.open).toHaveBeenCalledWith(expect.objectContaining({ title:'Optimize job ID required', variant:'warning' }));
    global.Toast.open.mockClear();
    root.querySelector('#ov-top-id').value = '5';
    root.querySelector('#ov-top-load').click();
    await flush();
    expect(global.Toast.open).toHaveBeenCalledWith(expect.objectContaining({ title:'Load TOP-N failed', variant:'error' }));
  });

  test('loadTopNInline success and no items branches', async () => {
    global.Toast = { open: jest.fn(), close: jest.fn() };
    global.EventSource = class { constructor(){ this.close=jest.fn(); } };
    const fetchMock = jest.fn(url => {
      if (url.startsWith('/analytics/overlay-sets')) return Promise.resolve(json({ sets:[] }));
      if (url.startsWith('/analytics/jobs')) return Promise.resolve(json({ jobs:[] }));
      if (url.startsWith('/analytics/optimize/7/inline-overlays')) return Promise.resolve(json({ items:[{jobId:2,equity:[]}] }));
      return Promise.resolve(json({}));
    });
    global.fetch = fetchMock;
    const { mount } = await import('../../client/public/assets/modules/analytics/overlays.js');
    const root = document.createElement('div');
    await mount(root);
    root.querySelector('#ov-top-id').value = '7';
    root.querySelector('#ov-top-inline').click();
    await flush();
    expect(global.Toast.open).toHaveBeenCalledWith(expect.objectContaining({ variant:'success' }));
    // no items branch
    fetchMock.mockImplementation(url => {
      if (url.startsWith('/analytics/overlay-sets')) return Promise.resolve(json({ sets:[] }));
      if (url.startsWith('/analytics/jobs')) return Promise.resolve(json({ jobs:[] }));
      if (url.startsWith('/analytics/optimize/8/inline-overlays')) return Promise.resolve(json({ items:[] }));
      return Promise.resolve(json({}));
    });
    root.querySelector('#ov-top-id').value = '8';
    root.querySelector('#ov-top-inline').click();
    await flush();
    expect(global.Toast.open).toHaveBeenCalledWith(expect.objectContaining({ title:'No inline overlays', variant:'warning' }));
  });
});


  test('shareUrl success copies link', async () => {
    global.Toast = { open: jest.fn(), close: jest.fn() };
    global.EventSource = class { constructor(){ this.close=jest.fn(); } };
    navigator.clipboard = { writeText: jest.fn() };
    const fetchMock = jest.fn(url => {
      if (url.startsWith('/analytics/overlay-sets')) return Promise.resolve(json({ sets:[] }));
      if (url.startsWith('/analytics/jobs')) return Promise.resolve(json({ jobs:[{id:1}] }));
      if (url.startsWith('/analytics?overlay_job_ids=1')) return Promise.resolve(json({ overlayEquities:[{jobId:1,equity:[{ts:1,equity:1}]}], overlayStatsByJobId:{}, baseline:null }));
      if (url === '/analytics/overlays/share') return Promise.resolve(json({ url:'/x' }));
      return Promise.resolve(json({}));
    });
    global.fetch = fetchMock;
    const { mount } = await import('../../client/public/assets/modules/analytics/overlays.js');
    const root = document.createElement('div'); await mount(root);
    root.querySelector('#ov-load').click();
    await flush();
    const cb = root.querySelector('#ov-jobs input[data-id="1"]');
    cb.checked = true; cb.dispatchEvent(new Event('change'));
    root.querySelector('#ov-share').click();
    await flush();
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    expect(global.Toast.open).toHaveBeenCalledWith(expect.objectContaining({ title:'URL copied', variant:'success' }));
  });

  test('loadTopNInline fetch error shows toast', async () => {
    global.Toast = { open: jest.fn(), close: jest.fn() };
    global.EventSource = class { constructor(){ this.close=jest.fn(); } };
    const fetchMock = jest.fn(url => {
      if (url.startsWith('/analytics/overlay-sets')) return Promise.resolve(json({ sets:[] }));
      if (url.startsWith('/analytics/jobs')) return Promise.resolve(json({ jobs:[] }));
      if (url.startsWith('/analytics/optimize/9/inline-overlays')) return Promise.reject(new Error('bad'));
      return Promise.resolve(json({}));
    });
    global.fetch = fetchMock;
    const { mount } = await import('../../client/public/assets/modules/analytics/overlays.js');
    const root = document.createElement('div'); await mount(root);
    root.querySelector('#ov-top-id').value = '9';
    root.querySelector('#ov-top-inline').click();
    await flush();
    expect(global.Toast.open).toHaveBeenCalledWith(expect.objectContaining({ title:'Load inline failed', variant:'error' }));
  });

