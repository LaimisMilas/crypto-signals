import { jest } from '@jest/globals';

describe('analytics overview module', () => {
  test('mount and respond to overlay events', async () => {
    global.Chart = class { constructor(){ this.data={ datasets:[] }; this.update=jest.fn(); this.destroy=jest.fn(); this.toBase64Image=jest.fn(()=> 'data:'); } };
    const root = document.createElement('div');
    const { mount } = await import('../../client/public/assets/modules/analytics/overview.js');
    const api = await mount(root);
    window.dispatchEvent(new CustomEvent('analytics:overlays:v2', { detail:{ items:[{ jobId:1, equity:[{ts:1,equity:1}] }], baseline:null, settings:{} } }));
    expect(window.AnalyticsChart.data.datasets.length).toBeGreaterThan(0);
    api.unmount();
    expect(root.innerHTML).toBe('');
  });
});
