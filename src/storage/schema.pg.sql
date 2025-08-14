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
  status TEXT,
  created_at BIGINT
);

CREATE INDEX IF NOT EXISTS idx_candles_ts ON candles(ts);
CREATE INDEX IF NOT EXISTS idx_signals_ts ON signals(ts);
CREATE INDEX IF NOT EXISTS idx_subs_subscription ON subscribers(subscription_id);
