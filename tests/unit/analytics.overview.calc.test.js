import { jest } from '@jest/globals';

function setup(){
  document.body.innerHTML = '<div id="root"></div>';
  global.Chart = class { constructor(){ this.data={ datasets: [] }; this.update=jest.fn(); this.toBase64Image=jest.fn(()=>"img"); } };
}

function flush(){ return new Promise(r=>setTimeout(r,0)); }

describe('analytics overview calculations', () => {
  beforeEach(() => { jest.clearAllMocks(); document.body.innerHTML=''; delete global.Chart; });

  test('renders with deltas and handles edge/noise', async () => {
    setup();
    const root = document.getElementById('root');
    const { mount } = await import('../../client/public/assets/modules/analytics/overview.js');
    const api = await mount(root);
    const overlay = { jobId:1, label:'A', equity:[{ts:1,equity:100},{ts:2,equity:130}] };
    const baseline = { equity:[{ts:1,equity:100},{ts:2,equity:120}] };
    window.dispatchEvent(new CustomEvent('analytics:overlays:v2', { detail:{ items:[overlay], baseline } }));
    expect(window.AnalyticsChart.data.datasets.length).toBe(2);
    expect(window.AnalyticsChart.data.datasets[1].label).toMatch(/ΔR/);
    // noise - NaN equity handled without crash
    window.dispatchEvent(new CustomEvent('analytics:overlays:v2', { detail:{ items:[{ jobId:2, label:'B', equity:[{ts:1,equity:NaN}]}], baseline:null } }));
    expect(window.AnalyticsChart.data.datasets[0].label).toBe('B');
    // edge clear
    window.dispatchEvent(new Event('analytics:overlay:clear'));
    expect(window.AnalyticsChart.data.datasets.length).toBe(0);
    api.unmount();
  });
});
