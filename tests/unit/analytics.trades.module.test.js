import { jest } from '@jest/globals';

describe('analytics trades module', () => {
  test('mount renders table rows', async () => {
    const trades = { trades:[{ time:0, symbol:'BTC', side:'BUY', qty:1, price:10 }] };
    global.fetch = jest.fn(() => Promise.resolve(new Response(JSON.stringify(trades), { status:200, headers:{'Content-Type':'application/json'} })));
    const { mount } = await import('../../client/public/assets/modules/analytics/trades.js');
    const root = document.createElement('div');
    const api = await mount(root);
    expect(root.querySelectorAll('tbody tr').length).toBe(1);
    api.unmount();
    expect(root.innerHTML).toBe('');
  });
});
