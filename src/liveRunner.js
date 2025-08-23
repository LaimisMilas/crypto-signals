// Minimal live runner supporting multiple strategies
process.env.TZ = process.env.TZ || 'Europe/Vilnius';
import { db } from './storage/db.js';
import { getStrategyById } from './strategies/index.js';
import { cfg } from './config.js';
import binance from './integrations/binance/client.js';
import { computeATR } from './risk/atr.js';
import { computePositionSize } from './risk/sizing.js';
import { loadExchangeFilters, roundPrice, ensureSymbolSettings } from './risk/limits.js';
import { buildOrders } from './risk/orders.js';
import { checkPreEntry } from './risk/guardrails.js';
import { ensureDayStart, updateRealizedPnlToday } from './risk/state.js';

async function selectRecentCandles(client, symbol, limit = 500) {
  const { rows } = await client.query(
    `SELECT ts, open, high, low, close, volume
       FROM candles
       WHERE symbol = $1
       ORDER BY ts DESC
       LIMIT $2`, [symbol, limit]
  );
  return rows.reverse().map(r => ({
    ts: Number(r.ts),
    open: Number(r.open),
    high: Number(r.high),
    low: Number(r.low),
    close: Number(r.close),
    volume: Number(r.volume),
  }));
}

async function openTrade(client, { ts, side, price, strategyId, params, symbol }) {
  await client.query(
    `INSERT INTO paper_trades (ts, side, price, status, strategy, params, symbol, opened_at, entry_price)
     VALUES ($1,$2,$3,'OPEN',$4,$5,$6,$1,$3)`,
    [ts, side, price, strategyId, JSON.stringify(params || {}), symbol]
  );
}

async function closeTrade(client, { ts, price, strategyId, symbol }) {
  const { rows } = await client.query(
    `SELECT id, entry_price FROM paper_trades
       WHERE status='OPEN' AND strategy=$1 AND symbol=$2
       ORDER BY id ASC LIMIT 1`, [strategyId, symbol]
  );
  if (!rows.length) return;
  const tr = rows[0];
  const pnl = (price - Number(tr.entry_price));
  await client.query(
    `UPDATE paper_trades
       SET status='CLOSED', exit_price=$1, closed_at=$2, pnl=$3
       WHERE id=$4`,
    [price, ts, pnl, tr.id]
  );
  await updateRealizedPnlToday(pnl);
}

export async function runOnce(liveConfig) {
  const { symbols = [], strategies = [] } = liveConfig;
  const client = await db.connect();
  try {
    for (const symbol of symbols) {
      const candles = await selectRecentCandles(client, symbol, 500);
      const { atr } = computeATR(candles, cfg.atrPeriod);
      const lastClose = candles[candles.length - 1]?.close;
      if (!Number.isFinite(atr) || !Number.isFinite(lastClose)) continue;
      for (const sCfg of strategies) {
        const strat = getStrategyById(sCfg.id);
        if (!strat) continue;
        const params = { ...strat.defaultParams, ...(sCfg.params || {}) };
        const { trades } = strat.generateSignals(candles, params);
        const last = trades[trades.length - 1];
        if (!last) continue;
        if (last.side === 'BUY' || last.side === 'SELL') {
          const side = last.side;
          const entry = last.price || lastClose;
          const slRaw = side === 'BUY' ? entry - cfg.slAtrMult * atr : entry + cfg.slAtrMult * atr;
          const tpRaw = side === 'BUY' ? entry + cfg.tpAtrMult * atr : entry - cfg.tpAtrMult * atr;
          const filters = await loadExchangeFilters(symbol);
          const entryPrice = roundPrice(entry, filters.tickSize);
          const sl = roundPrice(slRaw, filters.tickSize);
          const tp = roundPrice(tpRaw, filters.tickSize);
          const account = await binance.send('GET', '/fapi/v2/account', {}, { signed: true });
          const equity = Number(account.totalWalletBalance);
          const available = Number(account.availableBalance);
          await ensureDayStart(equity);
          const openPositions = (account.positions || []).filter(p => Number(p.positionAmt));
          const exposureBySymbol = {};
          for (const p of openPositions) {
            const notional = Math.abs(Number(p.notional));
            const pct = equity ? (notional / equity) * 100 : 0;
            exposureBySymbol[p.symbol] = pct;
          }
          const ctx = {
            symbol,
            side: side === 'BUY' ? 'LONG' : 'SHORT',
            entry: entryPrice,
            sl,
            qty: 0,
            notional: 0,
            equityNow: equity,
            openPositions,
            exposureBySymbol,
            atrVolPct: (atr / lastClose) * 100,
            pingFailures: 0,
          };
          await ensureSymbolSettings(symbol, { leverage: cfg.leverage, positionMode: cfg.positionMode });
          const { qty, reason } = computePositionSize({
            equity,
            availableBalance: available,
            entry: entryPrice,
            stop: sl,
            riskPct: cfg.riskPerTradePct,
            leverage: cfg.leverage,
            symbolFilters: filters,
          });
          ctx.qty = qty;
          ctx.notional = entryPrice * qty;
          const verdict = await checkPreEntry(ctx);
          if (verdict.halt) {
            console.log('Guardrails HALT', verdict.reason);
            break;
          }
          if (verdict.fail) {
            console.log('Trade skipped', verdict.reason);
            continue;
          }
          if (qty > 0) {
            const orders = buildOrders({ side, entryType: 'MARKET', entryPrice, qty, sl, tp, symbol });
            try {
              // entry first
              await binance.send('POST', '/fapi/v1/order', orders[0], { signed: true });
              // protective orders
              await binance.send('POST', '/fapi/v1/order', orders[1], { signed: true });
              await binance.send('POST', '/fapi/v1/order', orders[2], { signed: true });
              await openTrade(client, { ts: last.ts, side, price: entryPrice, strategyId: strat.id, params, symbol });
            } catch (e) {
              console.error('Order error', e);
            }
          } else {
            console.log('Trade skipped', reason);
          }
        }
      }
    }
  } finally {
    client.release();
  }
}

let runnerState = { status: 'RUNNING', lastError: null };
let activeConfig = null;

export function getRunnerStatus() {
  return runnerState;
}

export async function gracefulRestart(newCfg) {
  runnerState.status = 'RESTARTING';
  try {
    // Placeholder for stopping ongoing loops / timers
    activeConfig = newCfg;
  } catch (e) {
    runnerState.lastError = String(e);
  } finally {
    runnerState.status = 'RUNNING';
  }
}

export function getActiveRunnerConfig() {
  return activeConfig;
}
