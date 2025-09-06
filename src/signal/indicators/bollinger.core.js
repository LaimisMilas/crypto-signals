import { bollingerBands } from '../../indicators/bollinger.js';

export function computeBollingerBands20(candles) {
  const values = candles.map(c => c.close);
  const value = bollingerBands(values, 20, 2);
  return value == null ? null : value;
}

