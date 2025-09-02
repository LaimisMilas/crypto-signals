import { freezeCanvasEnv } from '../../client/public/assets/chart-globals.js';

describe('chart globals', () => {
  test('freezeCanvasEnv fixes animation and time', () => {
    const origDate = Date;
    window.__E2E__ = true;
    window.Chart = { defaults:{ animation:true } };
    freezeCanvasEnv(window, document);
    expect(window.Chart.defaults.animation).toBe(false);
    expect(new Date().toISOString()).toBe('2024-01-02T03:04:05.000Z');
    // cleanup
    window.Date = origDate;
  });
});
