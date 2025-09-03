import { jest } from '@jest/globals';

describe('chart globals register', () => {
  beforeEach(() => {
    jest.resetModules();
    delete global.Chart;
  });

  test('registers chart registerables on analytics import', async () => {
    const register = jest.fn();
    global.Chart = { register, registerables:[1,2] };
    await import('../../client/public/assets/analytics.js');
    expect(register).toHaveBeenCalledWith(1,2);
  });
});
