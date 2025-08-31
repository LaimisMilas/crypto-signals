BEGIN;

ALTER TABLE paper_trades
  ADD COLUMN IF NOT EXISTS strategy TEXT,
  ADD COLUMN IF NOT EXISTS params JSONB,
  ADD COLUMN IF NOT EXISTS symbol TEXT,
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pnl NUMERIC,
  ADD COLUMN IF NOT EXISTS pnl_pct NUMERIC,
  ADD COLUMN IF NOT EXISTS side TEXT,
  ADD COLUMN IF NOT EXISTS qty NUMERIC,
  ADD COLUMN IF NOT EXISTS entry_price NUMERIC,
  ADD COLUMN IF NOT EXISTS exit_price NUMERIC,
  ADD COLUMN IF NOT EXISTS status TEXT;

CREATE INDEX IF NOT EXISTS idx_paper_trades_closed_at ON paper_trades (closed_at);
CREATE INDEX IF NOT EXISTS idx_paper_trades_symbol ON paper_trades (symbol);
CREATE INDEX IF NOT EXISTS idx_paper_trades_strategy ON paper_trades (strategy);
CREATE INDEX IF NOT EXISTS idx_paper_trades_status ON paper_trades (status);
CREATE INDEX IF NOT EXISTS idx_paper_trades_params_gin ON paper_trades USING GIN (params jsonb_path_ops);

CREATE TABLE IF NOT EXISTS equity_history (
  ts TIMESTAMPTZ NOT NULL,
  symbol TEXT,
  strategy TEXT,
  params JSONB,
  equity NUMERIC NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_equity_history_ts ON equity_history (ts);
CREATE INDEX IF NOT EXISTS idx_equity_history_symbol ON equity_history (symbol);
CREATE INDEX IF NOT EXISTS idx_equity_history_strategy ON equity_history (strategy);
CREATE INDEX IF NOT EXISTS idx_equity_history_params_gin ON equity_history USING GIN (params jsonb_path_ops);

COMMIT;
