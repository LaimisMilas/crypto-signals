CREATE TYPE job_type AS ENUM ('backtest','optimize','walkforward');
CREATE TYPE job_status AS ENUM ('queued','running','succeeded','failed','canceled');

CREATE TABLE IF NOT EXISTS jobs (
  id           BIGSERIAL PRIMARY KEY,
  type         job_type      NOT NULL,
  status       job_status    NOT NULL DEFAULT 'queued',
  priority     SMALLINT      NOT NULL DEFAULT 0,
  params       JSONB         NOT NULL DEFAULT '{}',
  progress     REAL          NOT NULL DEFAULT 0,
  error        TEXT,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  started_at   TIMESTAMPTZ,
  finished_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC);
