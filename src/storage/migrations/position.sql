CREATE TABLE IF NOT EXISTS positions (
                                       ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  symbol TEXT NOT NULL,
  position_amt NUMERIC NOT NULL,
  entry_price NUMERIC,
  unrealized_pnl NUMERIC,
  mode TEXT, -- cross/isolated
  PRIMARY KEY (ts, symbol)
  );
CREATE INDEX IF NOT EXISTS idx_positions_symbol ON positions(symbol);
