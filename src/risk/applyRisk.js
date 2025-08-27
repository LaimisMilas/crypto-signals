import { noteRiskReject } from '../signal/instrumentation.js';

export function applyRiskAndStops(order, ctx) {
  const { strategy = 'default' } = ctx || {};
  // ... tavo taisyklės
  if (/* SL per platus */ false) {
    noteRiskReject({ strategy, reason: 'sl_too_wide' });
    return { ok: false, reason: 'sl_too_wide' };
  }
  if (/* per daug atvirų */ false) {
    noteRiskReject({ strategy, reason: 'max_open_trades' });
    return { ok: false, reason: 'max_open_trades' };
  }
  return { ok: true };
}
