CREATE TABLE IF NOT EXISTS candles (
                                       id SERIAL PRIMARY KEY,
                                       ts BIGINT NOT NULL UNIQUE,
                                       open DOUBLE PRECISION,
                                       high DOUBLE PRECISION,
                                       low DOUBLE PRECISION,
                                       close DOUBLE PRECISION,
                                       volume DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS signals (
                                       id SERIAL PRIMARY KEY,
                                       ts BIGINT NOT NULL,
                                       type TEXT CHECK(type IN ('BUY','SELL')) NOT NULL,
    price DOUBLE PRECISION NOT NULL,
    rsi DOUBLE PRECISION,
    atr DOUBLE PRECISION,
    aroon_up DOUBLE PRECISION,
    aroon_down DOUBLE PRECISION,
    reason TEXT
    );

CREATE TABLE IF NOT EXISTS subscribers (
                                           id SERIAL PRIMARY KEY,
                                           email TEXT,
                                           subscription_id TEXT,
                                           status TEXT, -- active, trialing, canceled, past_due, unpaid
                                           created_at BIGINT
);

CREATE INDEX IF NOT EXISTS idx_candles_ts ON candles(ts);
CREATE INDEX IF NOT EXISTS idx_signals_ts ON signals(ts);
CREATE INDEX IF NOT EXISTS idx_subs_subscription ON subscribers(subscription_id);

-- Paper trading state
CREATE TABLE IF NOT EXISTS paper_state (
  id INT PRIMARY KEY DEFAULT 1,
  running BOOLEAN DEFAULT FALSE,
  since TIMESTAMP,
  balance_start DOUBLE PRECISION DEFAULT 10000
);
INSERT INTO paper_state (id, running, since, balance_start)
  VALUES (1, FALSE, NULL, 10000)
  ON CONFLICT (id) DO NOTHING;

-- Paper trades
CREATE TABLE IF NOT EXISTS paper_trades (
  id SERIAL PRIMARY KEY,
  ts BIGINT NOT NULL,
  side TEXT CHECK(side IN ('BUY','SELL')) NOT NULL,
  price DOUBLE PRECISION NOT NULL,
  size DOUBLE PRECISION,
  pnl DOUBLE PRECISION,
  entry_price DOUBLE PRECISION,
  exit_price DOUBLE PRECISION,
  status TEXT CHECK(status IN ('OPEN','CLOSED')) DEFAULT 'OPEN',
  trail_top DOUBLE PRECISION,
  tp_pct DOUBLE PRECISION,
  sl_pct DOUBLE PRECISION,
  trail_pct DOUBLE PRECISION,
  risk_pct DOUBLE PRECISION
);
