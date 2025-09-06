import { noteRiskReject } from '../signal/instrumentation.js';

/**
 * Basic risk application and stop evaluation.
 *
 * Evaluates whether a position should be closed based on TP/SL levels or
 * trailing stop logic. Updates trailing stop top/bottom when price moves in
 * favor of the position.
 *
 * @param {Object} position Position/order information
 * @param {'BUY'|'SELL'} position.side      Entry side
 * @param {number} position.entry          Entry price
 * @param {number} [position.sl]           Stop loss price
 * @param {number} [position.tp]           Take profit price
 * @param {number} [position.trailPct]     Trailing stop percentage (0-1)
 * @param {number} [position.trailTop]     Current trailing top/bottom
 * @param {Object} ctx                      Context
 * @param {number} ctx.price                Latest market price
 * @param {string} [ctx.strategy='default'] Strategy identifier
 * @returns {{ok:boolean, reason?:string, trailTop?:number}}
 */
export function applyRiskAndStops(position, ctx = {}) {
  const { strategy = 'default', price } = ctx;
  const { side, sl, tp, trailPct, trailTop } = position;
  if (!Number.isFinite(price)) return { ok: true };

  const isLong = side === 'BUY';

  if (Number.isFinite(tp)) {
    const hit = isLong ? price >= tp : price <= tp;
    if (hit) {
      noteRiskReject({ strategy, reason: 'tp_hit' });
      return { ok: false, reason: 'tp_hit' };
    }
  }

  if (Number.isFinite(sl)) {
    const hit = isLong ? price <= sl : price >= sl;
    if (hit) {
      noteRiskReject({ strategy, reason: 'sl_hit' });
      return { ok: false, reason: 'sl_hit' };
    }
  }

  if (Number.isFinite(trailPct) && trailPct > 0) {
    let top = Number.isFinite(trailTop) ? trailTop : (position.entry ?? price);
    if (isLong) {
      if (price > top) top = price;
      else if (price <= top * (1 - trailPct)) {
        noteRiskReject({ strategy, reason: 'trail_hit' });
        return { ok: false, reason: 'trail_hit', trailTop: top };
      }
    } else {
      if (price < top) top = price;
      else if (price >= top * (1 + trailPct)) {
        noteRiskReject({ strategy, reason: 'trail_hit' });
        return { ok: false, reason: 'trail_hit', trailTop: top };
      }
    }
    return { ok: true, trailTop: top };
  }

  return { ok: true };
}
