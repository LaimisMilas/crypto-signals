export function bollingerBands(values, period = 20, stdDev = 2) {
  if (!Array.isArray(values) || values.length < period) return null;
  const slice = values.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / period;
  const sigma = Math.sqrt(variance);
  return {
    upper: mean + stdDev * sigma,
    middle: mean,
    lower: mean - stdDev * sigma
  };
}

