import { jest } from '@jest/globals';

let Analytics;

beforeEach(async () => {
  jest.resetModules();
  Analytics = await import('../../client/public/assets/analytics.js');
});

describe('analytics filters persistence', () => {
  test('persistFilters handles store errors', () => {
    const store = { setItem: () => { throw new Error('fail'); } };
    expect(() => Analytics.persistFilters(store)).not.toThrow();
  });

  test('loadFilters handles good, bad and missing data', () => {
    document.body.innerHTML = '<input name="symbol"><input name="interval"><input name="from"><input name="to"><input name="strategy"><select name="ds"></select><input name="n">';
    const goodStore = { getItem: () => JSON.stringify({ symbol:"SOL", interval:"1m", from_ms:"1", to_ms:"2", strategy:"ema", ds:"lttb", n:5 }) };
    Analytics.loadFilters(document, goodStore);
    const badStore = { getItem: () => 'bad json' };
    expect(() => Analytics.loadFilters(document, badStore)).not.toThrow();
    const emptyStore = { getItem: () => null };
    Analytics.loadFilters(document, emptyStore);
  });
});
