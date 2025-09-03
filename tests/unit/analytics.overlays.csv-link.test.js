import { jest } from '@jest/globals';

function json(obj, status=200){ return new Response(JSON.stringify(obj), { status, headers:{'Content-Type':'application/json'} }); }
function flush(){ return new Promise(r=>setTimeout(r,0)); }

describe('analytics overlays csv link', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    document.body.innerHTML='';
    delete global.fetch;
    delete global.Toast;
  });

  test('export csv builds url with ids', async () => {
    global.Toast = { open: jest.fn(), close: jest.fn() };
    global.EventSource = class { constructor(){ this.close=jest.fn(); } };
    window.open = jest.fn();
    global.fetch = jest.fn(url => {
      if (url.startsWith('/analytics/jobs')) return Promise.resolve(json({ jobs:[{id:1},{id:2}] }));
      return Promise.resolve(json({ overlayEquities:[], overlayStatsByJobId:{} }));
    });
    const root = document.createElement('div');
    const { mount } = await import('../../client/public/assets/modules/analytics/overlays.js');
    await mount(root);
    root.querySelector('#ov-load').click();
    await flush();
    const boxes = root.querySelectorAll('#ov-jobs input[data-id]');
    boxes[0].checked=true; boxes[0].dispatchEvent(new Event('change'));
    boxes[1].checked=true; boxes[1].dispatchEvent(new Event('change'));
    root.querySelector('#ov-export').click();
    expect(window.open).toHaveBeenCalledWith('/analytics/overlays.csv?job_ids=1,2', '_blank');
  });
});
