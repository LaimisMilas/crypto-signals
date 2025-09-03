import { jest } from '@jest/globals';

function json(obj, status=200){ return new Response(JSON.stringify(obj), { status, headers:{ 'Content-Type':'application/json' }}); }
function flush(){ return new Promise(r=>setTimeout(r,0)); }

describe('analytics overlays guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    document.body.innerHTML='';
    delete global.fetch;
    delete global.Toast;
  });

  test('apply/export/share guards and max overlays', async () => {
    global.Toast = { open: jest.fn(), close: jest.fn() };
    global.EventSource = class { constructor(){ this.close=jest.fn(); } };
    global.fetch = jest.fn(url => {
      if (url.startsWith('/analytics/jobs')){
        const jobs = Array.from({ length:6 }, (_,i)=>({ id:i+1, type:'backtest', params:{}, result:{} }));
        return Promise.resolve(json({ jobs }));
      }
      if (url.startsWith('/analytics/overlays/share')){
        return Promise.resolve(json({ url:'/s' }));
      }
      if (url.startsWith('/analytics?overlay_job_ids')){
        return Promise.resolve(json({ overlayEquities:[], overlayStatsByJobId:{} }));
      }
      return Promise.resolve(json({}));
    });
    window.open = jest.fn();
    const root = document.createElement('div');
    const { mount } = await import('../../client/public/assets/modules/analytics/overlays.js');
    await mount(root);

    // apply without selection
    root.querySelector('#ov-apply').click();
    expect(global.Toast.open).toHaveBeenCalledWith(expect.objectContaining({ title:'Select jobs first', variant:'warning' }));

    // export without selection
    root.querySelector('#ov-export').click();
    expect(global.Toast.open).toHaveBeenCalledWith(expect.objectContaining({ title:'Select jobs first', variant:'warning' }));

    // share without selection
    root.querySelector('#ov-share').click();
    expect(global.Toast.open).toHaveBeenCalledWith(expect.objectContaining({ title:'Select jobs first', variant:'warning' }));

    // load jobs and exceed max
    root.querySelector('#ov-load').click();
    await flush();
    const boxes = root.querySelectorAll('#ov-jobs input[data-id]');
    for (let i=0;i<5;i++){ boxes[i].checked=true; boxes[i].dispatchEvent(new Event('change')); }
    boxes[5].checked=true; boxes[5].dispatchEvent(new Event('change'));
    expect(boxes[5].checked).toBe(false);
    expect(global.Toast.open).toHaveBeenCalledWith(expect.objectContaining({ title:'Max 5 overlays', variant:'warning' }));
  });
});
