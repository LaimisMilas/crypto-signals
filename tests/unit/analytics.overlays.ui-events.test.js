import { jest } from '@jest/globals';

function json(obj, status=200){ return new Response(JSON.stringify(obj), { status, headers:{'Content-Type':'application/json'} }); }
const flush = () => new Promise(r=>setTimeout(r,0));

describe('analytics overlays ui-events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    document.body.innerHTML='';
  });

  test('checkbox toggle and baseline stats branches', async () => {
    global.Toast = { open: jest.fn(), close: jest.fn() };
    global.EventSource = class { constructor(){ this.close=jest.fn(); } addEventListener(){} };
    global.fetch = jest.fn(url => {
      if (url.startsWith('/analytics/overlay-sets')) return Promise.resolve(json({ sets: [] }));
      if (url.startsWith('/analytics/jobs')) return Promise.resolve(json({ jobs:[{ id:1, type:'bt' }] }));
      if (url.startsWith('/analytics?overlay_job_ids=1')) return Promise.resolve(json({ overlayEquities:[{ jobId:1, equity:[{ts:1,equity:1}] }], overlayStatsByJobId:{1:{return:0,maxDD:0}}, baseline:{ equity:[{ts:1,equity:100},{ts:2,equity:110}] } }));
      return Promise.resolve(json({}));
    });
    const root = document.createElement('div');
    const { mount } = await import('../../client/public/assets/modules/analytics/overlays.js');
    await mount(root);
    // load jobs
    root.querySelector('#ov-load').click();
    await flush();
    const cb = root.querySelector('#ov-jobs input[data-id="1"]');
    cb.checked = true; cb.dispatchEvent(new Event('change'));
    // apply overlays
    root.querySelector('#ov-apply').click();
    await flush();
    expect(root.querySelector('#ov-stats').textContent).toContain('ΔReturn vs Baseline');
    // uncheck to remove and apply without selections
    cb.checked = false; cb.dispatchEvent(new Event('change'));
    root.querySelector('#ov-apply').click();
    await flush();
    expect(global.Toast.open).toHaveBeenCalledWith(expect.objectContaining({ title:'Select jobs first' }));
  });
});

