CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  binance_order_id BIGINT,
  client_order_id TEXT,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  type TEXT NOT NULL,
  price DOUBLE PRECISION,
  stop_price DOUBLE PRECISION,
  qty DOUBLE PRECISION,
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
