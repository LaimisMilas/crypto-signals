import '../../client/public/assets/ui-loader.js';

describe('ui-loader', () => {
  test('show and hide skeleton', async () => {
    const div = document.createElement('div');
    window.UILoader.show(div, { type:'text', count:1 });
    expect(div.querySelector('.ui-skeleton')).toBeTruthy();
    window.UILoader.hide(div);
    expect(div.innerHTML).toBe('');
    const res = await window.UILoader.withLoader(div, () => 42);
    expect(res).toBe(42);
  });
});
