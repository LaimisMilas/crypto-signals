export function prepareData(candles) {
  if (!Array.isArray(candles) || candles.length === 0) return [];
  const last = candles[candles.length - 1];
  return [last.close];
}
