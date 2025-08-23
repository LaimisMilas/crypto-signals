import assert from 'assert';
import { computePositionSize } from '../../src/risk/sizing.js';

const filters = { stepSize: 0.01, minQty: 0.1, maxQty: 100, minNotional: 5 };

// basic sizing
let res = computePositionSize({
  equity: 1000,
  availableBalance: 1000,
  entry: 100,
  stop: 90,
  riskPct: 1,
  leverage: 5,
  symbolFilters: filters,
});
assert.ok(Math.abs(res.qty - 1) < 1e-8, `qty expected 1 got ${res.qty}`);

// too small after rounding
res = computePositionSize({
  equity: 1000,
  availableBalance: 1000,
  entry: 100,
  stop: 99,
  riskPct: 0.001,
  leverage: 5,
  symbolFilters: filters,
});
assert.equal(res.qty, 0);
assert.equal(res.reason, 'qty_too_small');

console.log('sizing.test passed');

