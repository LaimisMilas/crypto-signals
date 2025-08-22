export const id = 'rsi';
export const defaultParams = { period: 14, buyBelow: 30, sellAbove: 70 };

export function generateSignals(_candles, _params = {}) {
  return [];
}

export default { id, defaultParams, generateSignals };
