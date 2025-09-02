import { mount as lazyMount, unmount as lazyUnmount } from '../../client/public/assets/ui-lazy.js';
import { jest } from '@jest/globals';

describe('ui-lazy', () => {
  test('register, mount, prefetch and unmount', async () => {
    const loader = jest.fn().mockResolvedValue();
    window.UILazy.register('demo', loader);
    const mountFn = jest.fn();
    await lazyMount('demo', mountFn);
    expect(loader).toHaveBeenCalled();
    expect(mountFn).toHaveBeenCalled();
    global.fetch = jest.fn(() => Promise.resolve(new Response('', {status:200})));
    await window.UILazy.prefetch('demo', { resource:'/x' });
    expect(fetch).toHaveBeenCalledWith('/x', { credentials:'same-origin' });
    lazyUnmount('demo');
    expect(window.UILazy._modules.has('demo')).toBe(false);
  });
});
