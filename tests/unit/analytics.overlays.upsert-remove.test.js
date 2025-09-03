import { jest } from '@jest/globals';

function json(obj, status=200){ return new Response(JSON.stringify(obj), { status, headers:{'Content-Type':'application/json'} }); }
function flush(){ return new Promise(r=>setTimeout(r,0)); }

describe('analytics overlays upsert/remove', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    document.body.innerHTML='';
    delete global.fetch;
    delete global.Toast;
  });

  test('select apply and clear overlays', async () => {
    global.Toast = { open: jest.fn(), close: jest.fn() };
    global.EventSource = class { constructor(){ this.close=jest.fn(); } };
    global.fetch = jest.fn(url => {
      if (url.startsWith('/analytics/jobs')) return Promise.resolve(json({ jobs:[{ id:1, type:'backtest', params:{}, result:{} }] }));
      if (url.startsWith('/analytics?overlay_job_ids=1')) return Promise.resolve(json({ overlayEquities:[{ jobId:1, equity:[{ts:1,equity:1}] }], overlayStatsByJobId:{1:{return:0,maxDD:0}} }));
      return Promise.resolve(json({}));
    });
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');
    const root = document.createElement('div');
    const { mount } = await import('../../client/public/assets/modules/analytics/overlays.js');
    await mount(root);
    root.querySelector('#ov-load').click();
    await flush();
    const cb = root.querySelector('#ov-jobs input[data-id="1"]');
    cb.checked=true; cb.dispatchEvent(new Event('change'));
    root.querySelector('#ov-apply').click();
    await flush();
    expect(global.fetch).toHaveBeenCalledWith('/analytics?overlay_job_ids=1');
    expect(dispatchSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
    // clear all overlays
    root.querySelector('#ov-clear').click();
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type:'analytics:overlay:clear' }));
    // apply again should warn
    root.querySelector('#ov-apply').click();
    expect(global.Toast.open).toHaveBeenCalledWith(expect.objectContaining({ title:'Select jobs first', variant:'warning' }));
  });
});
