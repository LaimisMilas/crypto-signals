import { jest } from '@jest/globals';

function json(obj, status=200){ return new Response(JSON.stringify(obj), { status, headers:{'Content-Type':'application/json'} }); }
function flush(){ return new Promise(r=>setTimeout(r,0)); }

describe('analytics overlays api errors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    document.body.innerHTML='';
    delete global.fetch;
    delete global.Toast;
  });

  test('handles loadJobs and applyOverlays errors', async () => {
    global.Toast = { open: jest.fn(), close: jest.fn() };
    global.EventSource = class { constructor(){ this.close=jest.fn(); } };
    // first mount: loadJobs error
    global.fetch = jest.fn(() => Promise.resolve(new Response('', { status:500 })));
    const { mount } = await import('../../client/public/assets/modules/analytics/overlays.js');
    const root = document.createElement('div');
    await mount(root);
    root.querySelector('#ov-load').click();
    await flush();
    expect(global.Toast.open).toHaveBeenCalledWith(expect.objectContaining({ title:'Failed to load jobs', variant:'error' }));

    // remount for applyOverlays error
    jest.resetModules();
    global.Toast.open.mockClear();
    global.fetch = jest.fn(url => {
      if (url.startsWith('/analytics/jobs')) return Promise.resolve(json({ jobs:[{id:1,type:'backtest',params:{},result:{}}] }));
      if (url.startsWith('/analytics?overlay_job_ids=1')) return Promise.resolve(new Response('', { status:500 }));
      return Promise.resolve(json({}));
    });
    document.body.innerHTML='';
    const root2 = document.createElement('div');
    await mount(root2);
    root2.querySelector('#ov-load').click();
    await flush();
    const cb = root2.querySelector('#ov-jobs input[data-id="1"]');
    cb.checked=true; cb.dispatchEvent(new Event('change'));
    root2.querySelector('#ov-apply').click();
    await flush();
    expect(global.Toast.open).toHaveBeenCalledWith(expect.objectContaining({ title:'Apply failed', variant:'error' }));
  });
});
