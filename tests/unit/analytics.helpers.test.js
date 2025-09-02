import { composeAnalyticsQuery, normalizeEquity, overlayLabel, composeCsvUrl } from '../../client/assets/analytics.helpers.js';

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
});
