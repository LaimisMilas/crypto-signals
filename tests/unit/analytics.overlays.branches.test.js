import { jest } from '@jest/globals';

function json(obj){ return new Response(JSON.stringify(obj), { status:200, headers:{'Content-Type':'application/json'} }); }
function flush(){ return new Promise(r=>setTimeout(r,0)); }

describe('analytics overlays module branches', () => {
  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML='';
    global.EventSource = class { constructor(){ this.close=jest.fn(); } addEventListener(){} };
    global.Toast = { open: jest.fn(), close: jest.fn() };
  });

  async function mountWithFetch(fetchImpl){
    global.fetch = fetchImpl;
    const root = document.createElement('div');
    const { mount } = await import('../../client/public/assets/modules/analytics/overlays.js');
    await mount(root);
    return root;
  }

  test('guarded actions show warnings', async () => {
    const root = await mountWithFetch(jest.fn(url => {
      if (url.startsWith('/analytics/overlay-sets')) return Promise.resolve(json({ sets: [] }));
      return Promise.resolve(json({}));
    }));
    root.querySelector('#ov-export').click();
    root.querySelector('#ov-share').click();
    root.querySelector('#ov-top-load').click();
    root.querySelector('#ov-top-inline').click();
    root.querySelector('#ov-set-save').click();
    expect(global.Toast.open).toHaveBeenCalledTimes(5);
    expect(global.Toast.open.mock.calls.map(c=>c[0].title)).toEqual([
      'Select jobs first',
      'Select jobs first',
      'Optimize job ID required',
      'Optimize job ID required',
      'Name required'
    ]);
  });

  test('loadJobs error triggers toast', async () => {
    const root = await mountWithFetch(jest.fn(url => {
      if (url.startsWith('/analytics/overlay-sets')) return Promise.resolve(json({ sets: [] }));
      if (url.startsWith('/analytics/jobs')) return Promise.reject(new Error('fail'));
      return Promise.resolve(json({}));
    }));
    root.querySelector('#ov-load').click();
    await flush();
    expect(global.Toast.open).toHaveBeenCalledWith(expect.objectContaining({ title:'Failed to load jobs' }));
  });
});
