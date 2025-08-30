CREATE TABLE IF NOT EXISTS equity_snapshots (
  ts           BIGINT PRIMARY KEY,         -- epoch millis
  equity       DOUBLE PRECISION NOT NULL,
  source       TEXT NOT NULL DEFAULT 'live',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equity_snapshots_ts ON equity_snapshots(ts);
CREATE INDEX IF NOT EXISTS idx_equity_snapshots_source_ts ON equity_snapshots(source, ts);
