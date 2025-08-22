import ema from './ema.js';
import adx from './adx.js';
import rsi from './rsi.js';

const strategies = [ema, adx, rsi].filter(Boolean);

export function getStrategies() {
  return strategies;
}

export function getStrategyById(id) {
  return strategies.find(s => s.id === id);
}

export default { getStrategies, getStrategyById };
