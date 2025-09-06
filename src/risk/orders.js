/**
 * Build entry and protective orders (SL/TP) for Binance futures.
 *
 * @param {Object} p
 * @param {'BUY'|'SELL'} p.side        Entry side
 * @param {'MARKET'|'LIMIT'} [p.entryType='MARKET'] Entry order type
 * @param {number} p.entryPrice        Entry price (required for LIMIT)
 * @param {number} p.qty               Quantity
 * @param {number} p.sl                Stop loss price
 * @param {number} p.tp                Take profit price
 * @param {string} p.symbol            Symbol
 * @param {boolean} [p.reduceOnly=true] Whether protective orders should reduce only
 * @returns {Array<Object>} Array [entryOrder, slOrder, tpOrder]
 */
import binance from '../integrations/binance/client.js';
import { db } from '../storage/db.js';

export function buildOrders(p) {
  const {
    side,
    entryType = 'MARKET',
    entryPrice,
    qty,
    sl,
    tp,
    symbol,
    reduceOnly = true,
  } = p;

  const opp = side === 'BUY' ? 'SELL' : 'BUY';

  const entryOrder = {
    symbol,
    side,
    type: entryType,
    quantity: qty,
  };
  if (entryType === 'LIMIT') {
    entryOrder.price = entryPrice;
    entryOrder.timeInForce = 'GTC';
  }

  const slOrder = {
    symbol,
    side: opp,
    type: 'STOP_MARKET',
    stopPrice: sl,
    reduceOnly,
    quantity: qty,
  };

  const tpOrder = {
    symbol,
    side: opp,
    type: 'TAKE_PROFIT_MARKET',
    stopPrice: tp,
    reduceOnly,
    quantity: qty,
  };

  return [entryOrder, slOrder, tpOrder];
}

/**
 * Send array of orders sequentially to Binance futures API.
 *
 * @param {Array<Object>} orders Array of order payloads
 * @returns {Promise<Array<Object>>} array of responses
 */
export async function sendOrders(orders = []) {
  const results = [];
  for (const o of orders) {
    // POST /fapi/v1/order with signed payload
    const res = await binance.send('POST', '/fapi/v1/order', o, { signed: true });
    results.push(res);
    try {
      await db.query(
        `INSERT INTO orders (binance_order_id, client_order_id, symbol, side, type, price, stop_price, qty, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          res.orderId || null,
          res.clientOrderId || null,
          res.symbol,
          res.side,
          res.type,
          res.price ? Number(res.price) : null,
          res.stopPrice ? Number(res.stopPrice) : null,
          res.origQty ? Number(res.origQty) : null,
          res.status || null,
        ],
      );
    } catch {
      // DB logging failures should not interrupt order placement
    }
  }
  return results;
}

export default { buildOrders, sendOrders };

