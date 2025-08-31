ALTER TABLE paper_trades
  ADD COLUMN IF NOT EXISTS strategy TEXT,
  ADD COLUMN IF NOT EXISTS params JSONB;

CREATE INDEX IF NOT EXISTS idx_paper_trades_strategy ON paper_trades (strategy);
CREATE INDEX IF NOT EXISTS idx_paper_trades_params_gin ON paper_trades USING GIN (params jsonb_path_ops);
