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
        <input name="from" value=""/>
        <input name="to" value=""/>
        <select name="ds"><option value="lttb">lttb</option><option value="none" selected>none</option></select>
        <input name="n" type="number" value=""/>
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

describe('overlays clear + csv fallback + helper label', () => {
  beforeEach(async () => { jest.resetModules(); jest.clearAllMocks(); await mount(); });

  test('kai label nepaduotas → naudojamas helperio overlay label; po pašalinimo CSV → "#"', async () => {
    await Overlays.addOverlay?.('no-label', [{ ts: 2, equity: 111 }]);
    let ds = Analytics.getChart().data.datasets.find(d => (d.label||'').includes('Overlay'));
    expect(ds?.label).toBeTruthy();

    Overlays.removeOverlay?.('no-label');
    Overlays.updateOverlaysCsvLink?.();
    const href = document.querySelector('[data-testid="csv"]').getAttribute('href');
    expect(href).toBe('#');
    expect(Analytics.getChart().data.datasets.length).toBe(1);
  });
});
