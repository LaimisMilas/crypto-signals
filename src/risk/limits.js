import binance from '../integrations/binance/client.js';

const cache = new Map();
const CACHE_MS = 5 * 60 * 1000; // 5 minutes

function now() { return Date.now(); }

/** Load symbol filters from Binance exchangeInfo and cache them. */
export async function loadExchangeFilters(symbol) {
  const key = symbol.toUpperCase();
  const cached = cache.get(key);
  if (cached && cached.expiry > now()) return cached.data;

  const data = await binance.send('GET', '/fapi/v1/exchangeInfo', { symbol: key });
  const sym = data.symbols?.find(s => s.symbol === key);
  if (!sym) throw new Error('Symbol not found in exchangeInfo');

  const f = { tickSize: 0, stepSize: 0, minQty: 0, maxQty: Number.MAX_SAFE_INTEGER, minNotional: 0 };
  for (const filt of sym.filters || []) {
    if (filt.filterType === 'PRICE_FILTER') f.tickSize = Number(filt.tickSize);
    if (filt.filterType === 'LOT_SIZE') {
      f.stepSize = Number(filt.stepSize);
      f.minQty = Number(filt.minQty);
      f.maxQty = Number(filt.maxQty);
    }
    if (filt.filterType === 'MIN_NOTIONAL') f.minNotional = Number(filt.notional);
  }
  const filters = { ...f, pricePrecision: sym.pricePrecision, quantityPrecision: sym.quantityPrecision };
  cache.set(key, { data: filters, expiry: now() + CACHE_MS });
  return filters;
}

export function roundPrice(price, tickSize) {
  return Math.round(price / tickSize) * tickSize;
}

export function roundQty(qty, stepSize) {
  return Math.floor(qty / stepSize) * stepSize;
}

export function enforceNotional(price, qty, minNotional) {
  return price * qty >= minNotional;
}

const applied = new Set();
export async function ensureSymbolSettings(symbol, { leverage, positionMode = 'ONE_WAY' }) {
  const key = symbol.toUpperCase();
  if (applied.has(key)) return;
  if (leverage) {
    await binance.send('POST', '/fapi/v1/leverage', { symbol: key, leverage }, { signed: true });
  }
  if (positionMode) {
    const dualSidePosition = positionMode === 'HEDGE' ? 'true' : 'false';
    await binance.send('POST', '/fapi/v1/positionSide/dual', { dualSidePosition }, { signed: true });
  }
  applied.add(key);
}

export default { loadExchangeFilters, roundPrice, roundQty, enforceNotional, ensureSymbolSettings };

