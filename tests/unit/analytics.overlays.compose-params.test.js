import 'whatwg-fetch';
import 'jest-canvas-mock';
import { jest } from '@jest/globals';

const flush = () => new Promise(r=>setTimeout(r,0));
const json = obj => new Response(JSON.stringify(obj), { status:200, headers:{'Content-Type':'application/json'} });

async function mount(){
  document.body.innerHTML = `
    <section id="overlays-card">
      <div data-overlays-list></div>
      <a data-export-csv href="#"></a>
      <fieldset>
        <input name="symbol" value="SOL"/>
        <input name="interval" value="1m"/>
        <input name="from" value="1722470400000"/>
        <input name="to" value="2024-08-31"/>
        <select name="ds"><option value="none" selected>none</option><option value="lttb">lttb</option></select>
        <input name="n" type="number" value=""/>
        <button type="button" data-apply>Apply</button>
        <button type="button" data-reset>Reset</button>
      </fieldset>
    </section>
    <div id="toasts"></div>
    <canvas data-equity></canvas>
  `;
  global.Chart = class { constructor(){ this.data={ datasets:[] }; this.update=jest.fn(); } };
  global.fetch = jest.fn()
    .mockResolvedValueOnce(json({ equity:[{ts:1,equity:100}], links:{} }))
    .mockResolvedValueOnce(json([]))
    .mockResolvedValueOnce(json({}))
    .mockResolvedValue(json({ equity:[{ts:1,equity:101}], links:{} }));
  const Analytics = await import('../../client/public/assets/analytics.js');
  Analytics.init(document);
  await flush();
  return { fetchMock: global.fetch };
}

describe('overlays compose params branches', () => {
  beforeEach(() => { jest.clearAllMocks(); jest.resetModules(); });

  test('data-apply su ds=none ir n tuščias – siunčia tik ne-tuščius parametrus', async () => {
    const { fetchMock } = await mount();
    fetchMock.mockClear();
    document.querySelector('[data-apply]').click();
    await flush();
    const url = fetchMock.mock.calls[0][0];
    expect(url).toContain('/analytics?baseline=live');
    expect(url).toContain('ds=none');
    expect(url).toContain('n=0');
    expect(url).toMatch(/from_ms=1722470400000/);
    expect(url).toMatch(/to_ms=2024-08-31/);
  });

  test('data-reset išvalo laukus į tuščias/default', async () => {
    await mount();
    document.querySelector('[data-reset]').click();
    const from = document.querySelector('input[name="from"]');
    const ds = document.querySelector('select[name="ds"]');
    expect(from.value === '' || from.value === '1970-01-01').toBeTruthy();
    expect(ds.value).toBe('lttb');
  });
});

