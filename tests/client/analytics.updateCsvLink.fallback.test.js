import { jest } from '@jest/globals';
import 'jest-canvas-mock';

describe('analytics.updateCsvLink fallback branches', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML='';
    global.Chart = class { constructor(){ this.data={ datasets:[] }; this.update=jest.fn(); } };
  });
  afterEach(() => { delete global.Chart; });

  const json = (obj) => new Response(JSON.stringify(obj), { headers:{'Content-Type':'application/json'} });

  test('nėra [data-export-csv] → no-op (be throw)', async () => {
    document.body.innerHTML = `<canvas data-equity></canvas>`;
    global.fetch = jest.fn(() => Promise.resolve(json({ equity:[], links:{} })));
    const Analytics = await import('../../client/public/assets/analytics.js');
    Analytics.init(document);
    expect(() => Analytics.updateCsvLink(document)).not.toThrow();
  });

  test('tušti overlay ids → href "#"', async () => {
    document.body.innerHTML = `<a data-export-csv href="#"></a><canvas data-equity></canvas>`;
    global.fetch = jest.fn(() => Promise.resolve(json({ equity:[], links:{} })));
    const Analytics = await import('../../client/public/assets/analytics.js');
    Analytics.init(document);
    Analytics.updateCsvLink(document);
    expect(document.querySelector('[data-export-csv]').getAttribute('href')).toBe('#');
  });
});

