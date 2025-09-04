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
    const goodStore = { getItem: () => JSON.stringify({ symbol: 'SOL', n: 5 }) };
    const badStore = { getItem: () => 'bad json' };
    const emptyStore = { getItem: () => null };
    const good = Analytics.loadFilters(goodStore);
    expect(good.symbol).toBe('SOL');
    expect(() => Analytics.loadFilters(badStore)).not.toThrow();
    const empty = Analytics.loadFilters(emptyStore);
    expect(empty.symbol).toBe('SOLUSDT');
  });
});
