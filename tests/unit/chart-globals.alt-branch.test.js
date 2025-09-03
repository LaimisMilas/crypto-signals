import { jest } from '@jest/globals';

describe('chart-globals alt branch', () => {
  test('import without global.Chart necrashina', async () => {
    const saved = global.Chart;
    // @ts-ignore
    delete global.Chart;
    await import('../../client/public/assets/chart-globals.js');
    global.Chart = saved;
  });

  test('import with Chart.register necrashina', async () => {
    const saved = global.Chart;
    const reg = jest.fn();
    // @ts-ignore
    global.Chart = { register: reg };
    await import('../../client/public/assets/chart-globals.js?x=2');
    expect(reg).not.toHaveBeenCalled();
    global.Chart = saved;
  });
});

