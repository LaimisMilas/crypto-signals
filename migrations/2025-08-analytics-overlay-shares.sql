CREATE TABLE IF NOT EXISTS overlay_shares (
  id BIGSERIAL PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_overlay_shares_created ON overlay_shares(created_at DESC);
