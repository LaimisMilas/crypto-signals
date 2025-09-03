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

  test('applyOverlays success and missing', async () => {
    const fetchImpl = jest.fn(url => {
      if (url.startsWith('/analytics/overlay-sets')) return Promise.resolve(json({ sets: [] }));
      if (url.startsWith('/analytics/jobs')) return Promise.resolve(json({ jobs:[{ id:1, type:'backtest' }] }));
      if (url.startsWith('/analytics?overlay_job_ids=1')) {
        return Promise.resolve(json({ overlayEquities:[{ jobId:1, label:'A', equity:[] }], overlayStatsByJobId:{}, baseline:null }));
      }
      return Promise.resolve(json({}));
    });
    const root = await mountWithFetch(fetchImpl);
    root.querySelector('#ov-load').click();
    await flush();
    const cb = root.querySelector('#ov-jobs input[data-id="1"]');
    cb.checked = true; cb.dispatchEvent(new Event('change'));
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');
    root.querySelector('#ov-apply').click();
    await flush();
    expect(dispatchSpy).toHaveBeenCalled();
    expect(global.Toast.open).toHaveBeenCalledWith(expect.objectContaining({ title:'Overlays applied' }));
    dispatchSpy.mockRestore();

    // second call with missing equity
    fetchImpl.mockImplementation(url => {
      if (url.startsWith('/analytics/overlay-sets')) return Promise.resolve(json({ sets: [] }));
      if (url.startsWith('/analytics/jobs')) return Promise.resolve(json({ jobs:[{ id:1, type:'backtest' }] }));
      if (url.startsWith('/analytics?overlay_job_ids=1')) {
        return Promise.resolve(json({ overlayEquities:[], overlayStatsByJobId:{}, baseline:null }));
      }
      return Promise.resolve(json({}));
    });
    root.querySelector('#ov-apply').click();
    await flush();
    expect(global.Toast.open).toHaveBeenCalledWith(expect.objectContaining({ title:'No equity for jobs: 1' }));
  });

  test('clear/export/share flows', async () => {
    const fetchImpl = jest.fn(url => {
      if (url.startsWith('/analytics/overlay-sets')) return Promise.resolve(json({ sets: [] }));
      if (url.startsWith('/analytics/jobs')) return Promise.resolve(json({ jobs:[{ id:1, type:'backtest' }] }));
      if (url.startsWith('/analytics?overlay_job_ids=1')) return Promise.resolve(json({ overlayEquities:[{ jobId:1, label:'A', equity:[] }] }));
      if (url === '/analytics/overlays/share') return Promise.resolve(json({ url:'/x' }));
      return Promise.resolve(json({}));
    });
    const root = await mountWithFetch(fetchImpl);
    root.querySelector('#ov-load').click();
    await flush();
    const cb = root.querySelector('#ov-jobs input[data-id="1"]');
    cb.checked = true; cb.dispatchEvent(new Event('change'));

    // exportCsv
    const openSpy = jest.spyOn(window, 'open').mockImplementation(()=>{});
    root.querySelector('#ov-export').click();
    expect(openSpy).toHaveBeenCalledWith('/analytics/overlays.csv?job_ids=1', '_blank');
    openSpy.mockRestore();

    // shareUrl
    const clip = { writeText: jest.fn().mockResolvedValue() };
    Object.assign(navigator, { clipboard: clip });
    root.querySelector('#ov-share').click();
    await flush();
    expect(global.Toast.open).toHaveBeenCalledWith(expect.objectContaining({ title:'URL copied' }));

    // clearAll
    root.querySelector('#ov-clear').click();
    expect(global.Toast.open).toHaveBeenCalledWith(expect.objectContaining({ title:'Overlays cleared' }));
  });
});
