-- 1) Darbai (viena eilutė per užduotį)
CREATE TABLE IF NOT EXISTS jobs (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL,                -- 'backtest' | 'optimize' | 'walkforward'
  status TEXT NOT NULL DEFAULT 'queued', -- 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled'
  priority INT NOT NULL DEFAULT 100, -- mažesnis = aukštesnis
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  queued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  progress REAL DEFAULT 0,           -- 0..1
  params JSONB NOT NULL,             -- įvestis (symbol, strategy, date range, grid, WF config)
  result JSONB,                      -- trumpa suvestinė (pvz., best metrics)
  error TEXT                         -- klaidos pranešimas
);
CREATE INDEX IF NOT EXISTS idx_jobs_status_prio ON jobs(status, priority, id);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC);

-- 2) Artefaktai (failų nuorodos)
CREATE TABLE IF NOT EXISTS job_artifacts (
  id BIGSERIAL PRIMARY KEY,
  job_id BIGINT REFERENCES jobs(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,                -- 'csv' | 'json' | 'png' | 'zip' | 'html'
  label TEXT,
  path TEXT NOT NULL,                -- pvz., /data/jobs/<id>/results.csv
  size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_job_artifacts_job ON job_artifacts(job_id);

-- 3) Logai (stream’inimui real-time)
CREATE TABLE IF NOT EXISTS job_logs (
  id BIGSERIAL PRIMARY KEY,
  job_id BIGINT REFERENCES jobs(id) ON DELETE CASCADE,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  level TEXT NOT NULL DEFAULT 'info',  -- info|warn|error
  msg TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_job_logs_job_ts ON job_logs(job_id, ts);

-- 4) Papildoma: statuso NOTIFY (SSE atnaujinimui)
CREATE OR REPLACE FUNCTION notify_job_update() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('job_update', NEW.id::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_jobs_notify ON jobs;
CREATE TRIGGER trg_jobs_notify AFTER INSERT OR UPDATE ON jobs
FOR EACH ROW EXECUTE FUNCTION notify_job_update();

DROP TRIGGER IF EXISTS trg_job_logs_notify ON job_logs;
CREATE TRIGGER trg_job_logs_notify AFTER INSERT ON job_logs
FOR EACH ROW EXECUTE FUNCTION notify_job_update();
