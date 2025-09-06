import assert from 'assert';
import { jest } from '@jest/globals';

const sendMock = jest.fn(async (_m, _p, payload) => ({
  orderId: Math.floor(Math.random() * 1e6),
  clientOrderId: 'cid',
  status: 'NEW',
  ...payload,
}));
const dbMock = { query: jest.fn(async () => {}) };

jest.unstable_mockModule('../../src/integrations/binance/client.js', () => ({ default: { send: sendMock } }));
jest.unstable_mockModule('../../src/storage/db.js', () => ({ db: dbMock }));

const { buildOrders, sendOrders } = await import('../../src/risk/orders.js');

const orders = buildOrders({
  side: 'BUY',
  entryType: 'MARKET',
  entryPrice: 100,
  qty: 1,
  sl: 95,
  tp: 110,
  symbol: 'BTCUSDT',
});

const res = await sendOrders(orders);
assert.equal(sendMock.mock.calls.length, 3);
assert.equal(dbMock.query.mock.calls.length, 3);
assert.equal(res[0].symbol, 'BTCUSDT');

console.log('orders-exec.test passed');
