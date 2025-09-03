import { freezeCanvasEnv } from '../../client/public/assets/chart-globals.js';
import { jest } from '@jest/globals';

describe('chart-globals freezeCanvasEnv', () => {
  test('fixes env when Chart present', () => {
    const win = { __E2E__: true, Chart:{ defaults:{ animation:true } } };
    const doc = { createElement: () => ({ textContent:'', }), head:{ appendChild: jest.fn() } };
    freezeCanvasEnv(win, doc);
    expect(win.Chart.defaults.animation).toBe(false);
    const t = new win.Date();
    expect(t.getTime()).toBe(new Date('2024-01-02T03:04:05.000Z').getTime());
    expect(doc.head.appendChild).toHaveBeenCalled();
  });

  test('handles missing Chart', () => {
    const win = { __E2E__: true };
    const doc = { createElement: () => ({ textContent:'', }), head:{ appendChild: jest.fn() } };
    expect(() => freezeCanvasEnv(win, doc)).not.toThrow();
  });
});
