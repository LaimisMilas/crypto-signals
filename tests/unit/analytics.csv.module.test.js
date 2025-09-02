import { mount } from '../../client/public/assets/modules/analytics/csv.js';

describe('analytics csv module', () => {
  test('mount renders links and unmount clears', async () => {
    const root = document.createElement('div');
    const api = await mount(root);
    expect(root.querySelectorAll('li').length).toBe(2);
    api.unmount();
    expect(root.innerHTML).toBe('');
  });
});
