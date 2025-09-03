import { jest } from '@jest/globals';

const helpersMock = {
  composeAnalyticsQuery: jest.fn(),
  normalizeEquity: jest.fn(),
  overlayLabel: jest.fn(),
  composeCsvUrl: jest.fn(() => '#'),
};

jest.unstable_mockModule('../../client/assets/analytics.helpers.js', () => helpersMock);

function setupDom(){
  document.body.innerHTML = '<div id="toasts"></div><a data-export-csv href="#"></a>';
  global.Chart = class { constructor(){ this.data={datasets:[]}; this.update=jest.fn(); } };
}

describe('updateCsvLink fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML='';
    delete global.Chart;
    window.__DISABLE_AUTO_INIT__ = true;
  });

  test('missing link is safe', async () => {
    setupDom();
    const Analytics = await import('../../client/public/assets/analytics.js');
    Analytics.initEquityChart({});
    document.querySelector('[data-export-csv]').remove();
    expect(() => Analytics.updateCsvLink(document)).not.toThrow();
  });

  test('no overlays leads to # and empty compose call', async () => {
    setupDom();
    const Analytics = await import('../../client/public/assets/analytics.js');
    Analytics.initEquityChart({});
    Analytics.updateCsvLink(document);
    expect(helpersMock.composeCsvUrl).toHaveBeenCalledWith([], { from_ms:'', to_ms:'' });
    expect(document.querySelector('[data-export-csv]').getAttribute('href')).toBe('#');
  });
});
