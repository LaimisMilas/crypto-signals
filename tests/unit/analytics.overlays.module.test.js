import { jest } from '@jest/globals';

function json(obj){ return new Response(JSON.stringify(obj), { status:200, headers:{'Content-Type':'application/json'} }); }
function flush(){ return new Promise(r=>setTimeout(r,0)); }

describe('analytics overlays module', () => {
  test('mount interact and unmount', async () => {
    const esInstances = [];
    global.EventSource = class { constructor(url){ this.url=url; this.close=jest.fn(); esInstances.push(this); } addEventListener(){} };
    global.Toast = { open: jest.fn() };
    global.fetch = jest.fn(url => {
      if (url.startsWith('/analytics/overlay-sets')) return Promise.resolve(json({ sets: [] }));
      if (url.startsWith('/analytics/jobs')) return Promise.resolve(json({ jobs:[{ id:1, type:'backtest' }] }));
      if (url.startsWith('/analytics?overlay_job_ids=1')) return Promise.resolve(json({ overlayEquities:[{ jobId:1, label:'A', equity:[{ts:1,equity:1}] }], overlayStatsByJobId:{1:{return:0,maxDD:0}} }));
      return Promise.resolve(json({}));
    });
    const root = document.createElement('div');
    const { mount } = await import('../../client/public/assets/modules/analytics/overlays.js');
    const api = await mount(root);
    // load jobs
    root.querySelector('#ov-load').click();
    await flush();
    const cb = root.querySelector('#ov-jobs input[data-id="1"]');
    cb.checked = true; cb.dispatchEvent(new Event('change'));
    // apply overlays
    root.querySelector('#ov-apply').click();
    await flush();
    expect(global.fetch).toHaveBeenCalledWith('/analytics?overlay_job_ids=1');
    api.unmount();
    expect(esInstances[0].close).toHaveBeenCalled();
  });
});
