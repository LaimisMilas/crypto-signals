import { composeAnalyticsQuery, normalizeEquity, overlayLabel, composeCsvUrl } from '../../client/assets/analytics.helpers.js';
import { initEquityChart, setBaseline, upsertOverlay, removeOverlay, getChart } from '../../client/public/assets/analytics.js';
import { jest } from '@jest/globals';

describe('analytics helpers', () => {
  test('composeAnalyticsQuery skips empty values', () => {
    const q = composeAnalyticsQuery({ symbol: 'SOLUSDT', from_ms: 1, to_ms: 2, strategy: '' });
    expect(q).toContain('symbol=SOLUSDT');
    expect(q).toContain('from_ms=1');
    expect(q).toContain('to_ms=2');
    expect(q).not.toContain('strategy=');
  });

  test('normalizeEquity filters and sorts', () => {
    const input = [
      { ts: 2, equity: '2' },
      { ms: 1, equity: '1' },
      { ts: 'bad', equity: 3 },
      { ts: 3, equity: 'bad' },
    ];
    expect(normalizeEquity(input)).toEqual([
      { ts: 1, equity: 1 },
      { ts: 2, equity: 2 },
    ]);
    expect(normalizeEquity(null)).toEqual([]);
  });

  test('overlayLabel handles id or object', () => {
    expect(overlayLabel({ id: 'job-123' })).toBe('Overlay: job-123');
    expect(overlayLabel('job-999')).toBe('Overlay: job-999');
  });

  test('composeCsvUrl builds path', () => {
    expect(composeCsvUrl(['a','b'], { from_ms: 1, to_ms: 2 })).toBe('/analytics/overlays.csv?ids=a%2Cb&from_ms=1&to_ms=2');
    expect(composeCsvUrl([])).toBe('#');
  });

  test('chart baseline and overlays', async () => {
    global.Chart = class { constructor(){ this.data={ datasets:[] }; this.update=jest.fn(); } };
    // minimal DOM for init
    document.body.innerHTML = '<canvas data-equity></canvas><div data-overlays-list></div><table data-jobs-table><tbody></tbody></table><a data-export-csv href="#"></a><input name="symbol"><input name="interval"><input name="from"><input name="to"><select name="ds"></select><input name="n">';
    global.fetch = jest.fn(() => Promise.resolve(new Response(JSON.stringify({ equity:[], links:{} }), { status:200, headers:{'Content-Type':'application/json'} })));
    jest.resetModules();
    const mod = await import('../../client/public/assets/analytics.js');
    mod.init(document);
    await new Promise(r=>setTimeout(r,0));
    mod.setBaseline([{ ts:1, equity:1 }]);
    let chart = mod.getChart();
    expect(chart.data.datasets[0].label).toBe('Baseline');
    mod.upsertOverlay('7', [{ ts:1, equity:2 }], 'Ov7');
    expect(mod.getChart().data.datasets.length).toBe(2);
    mod.upsertOverlay('7', [{ ts:1, equity:3 }], 'Ov7');
    expect(mod.getChart().data.datasets.length).toBe(2);
    mod.removeOverlay('7');
    chart = mod.getChart();
    expect(chart.data.datasets.length).toBe(1);
  });
});
