import 'whatwg-fetch';
import 'jest-canvas-mock';
import { jest } from '@jest/globals';

let Analytics;
let Overlays;

async function mount() {
  document.body.innerHTML = `
    <section id="overlays-card">
      <div data-overlays-list></div>
      <a data-export-csv href="#" data-testid="csv"></a>
      <fieldset>
        <input name="from" value="2025-08-01"/>
        <input name="to" value="2025-08-31"/>
        <select name="ds"><option value="lttb" selected>lttb</option><option value="none">none</option></select>
        <input name="n" type="number" value="1000"/>
        <button type="button" data-apply>Apply</button>
        <button type="button" data-reset>Reset</button>
      </fieldset>
    </section>
    <div id="toasts"></div>
    <canvas data-equity></canvas>
  `;
  global.Chart = class { constructor(){ this.data={ datasets:[] }; this.update = jest.fn(); } };
  Analytics = await import('../../client/public/assets/analytics.js');
  Overlays = await import('../../client/public/assets/modules/analytics/overlays.js');
  const ctx = document.querySelector('canvas').getContext?.('2d') ?? {};
  Analytics.initEquityChart(ctx);
  Analytics.setBaseline([{ ts: 1, equity: 100 }]);
}

describe('overlays api success', () => {
  beforeEach(async () => { jest.resetModules(); jest.clearAllMocks(); await mount(); });

  test('addOverlayFromApi success → adds dataset and updates CSV link', async () => {
    const payload = {
      equity: [{ ts: 1, equity: 110 }, { ts: 2, equity: 120 }],
      links: { overlaysCsv: '/csv/overlays?id=ok' }
    };
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(payload), { status: 200 })
    );
    await Overlays.addOverlayFromApi?.('ok');

    const ch = Analytics.getChart();
    expect(ch.data.datasets.length).toBeGreaterThan(1);
    const href = document.querySelector('[data-testid="csv"]').getAttribute('href');
    expect(href && href !== '#').toBeTruthy();
  });
});
