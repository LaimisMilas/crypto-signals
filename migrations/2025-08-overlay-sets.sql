CREATE TABLE IF NOT EXISTS overlay_sets (
  id           BIGSERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  description  TEXT,
  payload      JSONB NOT NULL,
  pinned       BOOLEAN NOT NULL DEFAULT FALSE,
  token        TEXT UNIQUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_overlay_sets_updated ON overlay_sets(updated_at DESC);

CREATE OR REPLACE FUNCTION trg_overlay_sets_mts() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS overlay_sets_set_updated ON overlay_sets;
CREATE TRIGGER overlay_sets_set_updated BEFORE UPDATE ON overlay_sets
FOR EACH ROW EXECUTE FUNCTION trg_overlay_sets_mts();
