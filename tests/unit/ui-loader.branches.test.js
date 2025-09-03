import '../../client/public/assets/ui-loader.js';
import { jest } from '@jest/globals';

describe('ui-loader extra branches', () => {
  beforeEach(() => { document.body.innerHTML=''; jest.clearAllMocks(); });

  test.each([
    { type:'text', count:2 },
    { type:'title' },
    { type:'rect', count:1 },
    { type:'circle' },
    { type:'row', count:1 },
    { type:'table', rows:2 },
    { type:'unknown', count:1 },
  ])('renderSkeleton handles %o', spec => {
    const div = document.createElement('div');
    window.UILoader.renderSkeleton(div, spec);
    expect(div.querySelector('.ui-loader-stack')).toBeTruthy();
  });

  test('withLoader success and failure', async () => {
    const div = document.createElement('div');
    const val = await window.UILoader.withLoader(div, async () => 5, { type:'text', count:1 });
    expect(val).toBe(5);
    expect(div.innerHTML).toBe('');
    await expect(window.UILoader.withLoader(div, async () => { throw new Error('x'); }))
      .rejects.toThrow('x');
    expect(div.innerHTML).toBe('');
  });
});
