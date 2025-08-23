import assert from 'assert';
import { roundPrice, roundQty, enforceNotional } from '../../src/risk/limits.js';

assert.equal(roundPrice(1.234, 0.01), 1.23);
assert.equal(roundPrice(1.235, 0.01), 1.24);
assert.equal(roundQty(1.239, 0.01), 1.23);
assert.equal(roundQty(0.099, 0.01), 0.09);
assert.ok(enforceNotional(100, 0.1, 5));
assert.ok(!enforceNotional(10, 0.1, 5));

console.log('limits.test passed');

