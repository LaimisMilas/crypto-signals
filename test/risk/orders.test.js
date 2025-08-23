import assert from 'assert';
import { buildOrders } from '../../src/risk/orders.js';

let [entry, sl, tp] = buildOrders({
  side: 'BUY',
  entryType: 'MARKET',
  entryPrice: 100,
  qty: 1,
  sl: 95,
  tp: 110,
  symbol: 'BTCUSDT',
});
assert.equal(entry.side, 'BUY');
assert.equal(sl.side, 'SELL');
assert.equal(tp.type, 'TAKE_PROFIT_MARKET');

[entry, sl, tp] = buildOrders({
  side: 'SELL',
  entryType: 'LIMIT',
  entryPrice: 100,
  qty: 2,
  sl: 105,
  tp: 90,
  symbol: 'BTCUSDT',
});
assert.equal(entry.type, 'LIMIT');
assert.equal(entry.price, 100);
assert.equal(sl.side, 'BUY');

console.log('orders.test passed');

