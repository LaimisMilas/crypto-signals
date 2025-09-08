-- add optional remote_url for externally stored artifacts
ALTER TABLE IF EXISTS job_artifacts
  ADD COLUMN IF NOT EXISTS remote_url TEXT;
