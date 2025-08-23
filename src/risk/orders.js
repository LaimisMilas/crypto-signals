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

export default { buildOrders };

