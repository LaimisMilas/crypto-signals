import '../../client/public/assets/ui-loader.js';
import { jest } from '@jest/globals';

describe('ui-loader', () => {
  beforeEach(() => { document.body.innerHTML=''; jest.clearAllMocks(); });

  test('show and hide loader', () => {
    const div = document.createElement('div');
    window.UILoader.show(div);
    expect(div.querySelector('.ui-loader-stack')).toBeTruthy();
    window.UILoader.hide(div);
    expect(div.innerHTML).toBe('');
  });

  test('double hide no error', () => {
    const div = document.createElement('div');
    window.UILoader.show(div);
    window.UILoader.hide(div);
    expect(() => window.UILoader.hide(div)).not.toThrow();
    expect(div.innerHTML).toBe('');
  });

  test('missing container is noop', () => {
    expect(() => window.UILoader.show(null)).not.toThrow();
    expect(() => window.UILoader.hide(undefined)).not.toThrow();
  });
});
