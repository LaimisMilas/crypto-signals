import 'jest-canvas-mock';
import { jest } from '@jest/globals';

let Analytics;
let Overlays;

async function mount() {
  document.body.innerHTML = `
    <section id="overlays-card">
      <div data-overlays-list></div>
      <a data-export-csv href="#"></a>
      <fieldset>
        <input name="from" value="2025-08-01"/>
        <input name="to" value="2025-08-31"/>
        <select name="ds"><option value="lttb" selected>lttb</option><option value="none">none</option></select>
        <input name="n" type="number" value="3"/>
      </fieldset>
    </section>
    <canvas data-equity></canvas>
  `;
  global.Chart = class { constructor(){ this.data={ datasets:[] }; this.update = jest.fn(); } };
  Analytics = await import('../../client/public/assets/analytics.js');
  Overlays = await import('../../client/public/assets/modules/analytics/overlays.js');
  const ctx = document.querySelector('canvas').getContext?.('2d') ?? {};
  Analytics.initEquityChart(ctx);
  Analytics.setBaseline([{ ts: 0, equity: 100 }]);
}

describe('overlays lttb decimation', () => {
  beforeEach(async () => { jest.resetModules(); jest.clearAllMocks(); await mount(); });

  test('addOverlay su ilga seka ir n=3 → dataset supjaustomas (pirmas/galinis išlieka)', async () => {
    const series = Array.from({ length: 10 }, (_, i) => ({ ts: i + 1, equity: 100 + i * 5 }));
    await Overlays.addOverlay?.('lttb-1', series);
    let ds = Analytics.getChart().data.datasets.find(d => (d.label || '').includes('lttb-1'));
    expect(ds).toBeTruthy();
    expect(ds.data.length).toBeLessThan(series.length);
    expect(ds.data[0]).toBe(series[0].equity);
    expect(ds.data.at(-1)).toBe(series.at(-1).equity);
    // now set n large to avoid decimation
    document.querySelector('[name=n]').value = '100';
    await Overlays.addOverlay?.('lttb-2', series);
    ds = Analytics.getChart().data.datasets.find(d => (d.label || '').includes('lttb-2'));
    expect(ds.data.length).toBe(series.length);
  });
});
