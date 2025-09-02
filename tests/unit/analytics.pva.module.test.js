import { jest } from '@jest/globals';

describe('analytics pva module', () => {
  test('mount creates chart and unmount destroys', async () => {
    const destroy = jest.fn();
    global.Chart = class { constructor(){ this.destroy=destroy; this.data={datasets:[]}; this.update=jest.fn(); } };
    const root = document.createElement('div');
    const { mount } = await import('../../client/public/assets/modules/analytics/pva.js');
    const api = await mount(root);
    api.unmount();
    expect(destroy).toHaveBeenCalled();
  });
});
