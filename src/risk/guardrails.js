import { loadConfig, getState, setState, logHalt } from './state.js';

function getLocalTime(timezone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour12: false,
    weekday: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date());
  const obj = {};
  for (const p of parts) obj[p.type] = p.value;
  return { weekday: Number(obj.weekday), time: `${obj.hour}:${obj.minute}` };
}

function isWithinTradingSession(sess) {
  if (!sess) return true;
  const tz = sess.timezone || 'UTC';
  const { weekday, time } = getLocalTime(tz);
  if (Array.isArray(sess.weekdays) && !sess.weekdays.includes(weekday)) return false;
  if (!Array.isArray(sess.windows) || !sess.windows.length) return true;
  return sess.windows.some(w => time >= w.start && time <= w.end);
}

function computeDailyLossPct(st, equityNow) {
  if (!st || !st.equity_day_start) return 0;
  const base = Number(st.equity_day_start);
  if (!base) return 0;
  return ((equityNow - base) / base) * 100;
}

function computeIntradayDDPct(st, equityNow) {
  if (!st || !st.equity_day_high) return 0;
  const high = Number(st.equity_day_high);
  if (!high) return 0;
  return ((equityNow - high) / high) * 100;
}

let haltTimer = null;
async function scheduleResume(cfg) {
  if (haltTimer) clearTimeout(haltTimer);
  const minutes = Number(cfg?.circuitBreakers?.haltCooldownMin || 0);
  if (minutes > 0) {
    haltTimer = setTimeout(async () => {
      await setState({ state: 'RUNNING', reason: null });
      await logHalt('RESUME', 'auto', null);
    }, minutes * 60 * 1000);
  }
}

export async function checkPreEntry(ctx) {
  const cfg = await loadConfig();
  const st = await getState();

  const ok = () => ({ ok: true });
  const fail = (reason, details) => ({ ok: false, fail: true, reason, details });
  const halt = async (reason, details) => {
    await setState({ state: 'HALTED', reason });
    await logHalt('HALT', reason, details || null);
    await scheduleResume(cfg);
    return { ok: false, halt: true, reason, details };
  };

  if (st.state === 'HALTED') {
    return { ok: false, halt: true, reason: st.reason };
  }

  // 1) Sessions
  if (!isWithinTradingSession(cfg.sessions)) return fail('outside_session');

  const {
    symbol,
    side,
    entry,
    sl,
    qty,
    equityNow,
    openPositions = [],
    exposureBySymbol = {},
    atrVolPct = 0,
    pingFailures = 0,
  } = ctx;

  // 2) Allowed symbols/sides
  if (cfg.blockedSymbols.includes(symbol)) return fail('blocked_symbol');
  if (cfg.allowedSymbols.length && !cfg.allowedSymbols.includes(symbol)) return fail('symbol_not_allowed');
  if (!cfg.allowedSides.includes(side)) return fail('side_not_allowed');

  // 3) Per-trade risk cap
  const riskPerUnit = Math.abs(entry - sl);
  const riskUsd = riskPerUnit * qty;
  const riskPct = (riskUsd / equityNow) * 100;
  if (riskPct > cfg.riskPerTradePctCap) return fail('risk_per_trade_exceeds_cap', { riskPct });

  // 4) Position/exposure limits
  if (openPositions.length >= cfg.maxOpenPositionsGlobal) return fail('too_many_open_positions');
  const openPerSymbol = openPositions.filter(p => p.symbol === symbol).length;
  if (openPerSymbol >= cfg.maxOpenPerSymbol) return fail('too_many_open_per_symbol');
  const exposurePct = exposureBySymbol[symbol] || 0;
  if (exposurePct > cfg.maxExposurePctPerSymbol) return fail('exposure_exceeds_symbol_pct', { exposurePct });

  // 6) Circuit breakers
  if (atrVolPct > cfg.circuitBreakers.atrVolPctLimit) return await halt('volatility_spike', { atrVolPct });
  if (pingFailures >= cfg.circuitBreakers.pingFailuresToHalt) return await halt('connectivity', { pingFailures });

  // 7) Daily loss / drawdown
  const dailyLossPct = computeDailyLossPct(st, equityNow);
  const intradayDDPct = computeIntradayDDPct(st, equityNow);
  if (dailyLossPct <= -cfg.maxDailyLossPct) return await halt('max_daily_loss', { dailyLossPct });
  if (intradayDDPct <= -cfg.maxIntradayDrawdownPct) return await halt('intraday_drawdown', { intradayDDPct });

  return ok();
}

export default { checkPreEntry };
