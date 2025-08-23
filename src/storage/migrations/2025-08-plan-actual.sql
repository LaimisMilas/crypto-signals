-- 1) Išplėsti paper_trades planuotais laukais
ALTER TABLE paper_trades
  ADD COLUMN IF NOT EXISTS planned_entry NUMERIC,
  ADD COLUMN IF NOT EXISTS planned_sl NUMERIC,
  ADD COLUMN IF NOT EXISTS planned_tp NUMERIC,
  ADD COLUMN IF NOT EXISTS planned_qty NUMERIC,
  ADD COLUMN IF NOT EXISTS risk_usd NUMERIC,
  ADD COLUMN IF NOT EXISTS atr NUMERIC,
  ADD COLUMN IF NOT EXISTS exit_reason TEXT,          -- 'tp_hit' | 'sl_hit' | 'manual' | null
  ADD COLUMN IF NOT EXISTS fees_usd NUMERIC,          -- kaupiamos komisijos, jei turime
  ADD COLUMN IF NOT EXISTS slippage_entry_bps NUMERIC,
  ADD COLUMN IF NOT EXISTS slippage_exit_bps NUMERIC,
  ADD COLUMN IF NOT EXISTS mae_usd NUMERIC,
  ADD COLUMN IF NOT EXISTS mfe_usd NUMERIC,
  ADD COLUMN IF NOT EXISTS r_multiple NUMERIC,
  ADD COLUMN IF NOT EXISTS hold_ms BIGINT;

-- 2) Fills normalizavimui (jei dar neturime)
CREATE TABLE IF NOT EXISTS trade_fills (
                                         id BIGSERIAL PRIMARY KEY,
                                         trade_id BIGINT REFERENCES paper_trades(id) ON DELETE CASCADE,
  side TEXT,                      -- BUY/SELL
  price NUMERIC,
  qty NUMERIC,
  commission NUMERIC,             -- jei WS/REST pateikia
  commission_asset TEXT,
  is_entry BOOLEAN,               -- true: entry, false: exit (SL/TP/Manual)
  ts TIMESTAMPTZ NOT NULL DEFAULT now()
  );
CREATE INDEX IF NOT EXISTS idx_trade_fills_trade_id ON trade_fills(trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_fills_ts ON trade_fills(ts);

-- 3) Pagalba MAE/MFE: indeksai candles lentelei (jei trūksta)
CREATE INDEX IF NOT EXISTS idx_candles_symbol_ts ON candles(symbol, ts);
