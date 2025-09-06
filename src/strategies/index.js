import ema from './ema.js';
import adx from './adx.js';
import rsi from './rsi.js';

// Registry of available strategies
const registry = new Map();

function register(strat) {
  if (strat?.id) registry.set(strat.id, strat);
}

// Register built-in strategies
[ema, adx, rsi].forEach(register);

export function getStrategies() {
  return Array.from(registry.values());
}

export function getStrategyById(id) {
  return registry.get(id);
}

export function createStrategy(cfg = {}) {
  const strat = getStrategyById(cfg.id);
  if (!strat) return null;
  const params = { ...strat.defaultParams, ...(cfg.params || {}) };
  return { ...strat, params };
}

export function createStrategies(list = []) {
  return list.map(createStrategy).filter(Boolean);
}

export default { register, getStrategies, getStrategyById, createStrategy, createStrategies };
