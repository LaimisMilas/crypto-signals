/**
 * Compute futures position size based on risk parameters.
 *
 * @param {Object} p
 * @param {number} p.equity         Total account equity in quote currency
 * @param {number} p.availableBalance Available balance
 * @param {number} p.entry          Planned entry price
 * @param {number} p.stop           Planned stop price
 * @param {number} p.riskPct        Risk per trade in percent of equity
 * @param {number} p.leverage       Desired leverage
 * @param {Object} p.symbolFilters  Exchange filters (tickSize, stepSize, minQty, maxQty, minNotional)
 * @returns {{ qty: number, reason?: string }}
 */
export function computePositionSize(p) {
  const {
    equity,
    availableBalance,
    entry,
    stop,
    riskPct,
    leverage,
    symbolFilters = {},
  } = p;

  const riskUsd = Number(equity) * (Number(riskPct) / 100);
  const stopDist = Math.abs(Number(entry) - Number(stop));
  if (!(riskUsd > 0) || !(stopDist > 0)) {
    return { qty: 0, reason: 'invalid_params' };
  }

  const qtyRaw = riskUsd / stopDist;
  const maxQtyByLeverage = (Number(availableBalance) * Number(leverage) * 0.95) / Number(entry);
  let qty = Math.min(qtyRaw, maxQtyByLeverage);

  const stepSize = Number(symbolFilters.stepSize || symbolFilters.lotSize?.stepSize || 0.0001);
  const minQty = Number(symbolFilters.minQty || symbolFilters.lotSize?.minQty || 0);
  const maxQty = Number(symbolFilters.maxQty || symbolFilters.lotSize?.maxQty || Number.MAX_SAFE_INTEGER);
  const minNotional = Number(symbolFilters.minNotional || 0);

  qty = Math.floor(qty / stepSize) * stepSize;
  if (qty < minQty) return { qty: 0, reason: 'qty_too_small' };
  if (qty > maxQty) qty = Math.floor(maxQty / stepSize) * stepSize;

  if (minNotional && Number(entry) * qty < minNotional) {
    return { qty: 0, reason: 'min_notional' };
  }

  return { qty };
}

export default { computePositionSize };

