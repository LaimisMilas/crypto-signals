DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_candles_symbol_ts') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='candles' AND column_name='symbol') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='candles' AND column_name='ts')
  THEN
    EXECUTE 'CREATE INDEX idx_candles_symbol_ts ON candles(symbol, ts)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_trade_fills_trade_id') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='trade_fills' AND column_name='trade_id')
  THEN
    EXECUTE 'CREATE INDEX idx_trade_fills_trade_id ON trade_fills(trade_id)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_job_logs_job_id_created') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='job_logs' AND column_name='job_id') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='job_logs' AND column_name='created')
  THEN
    EXECUTE 'CREATE INDEX idx_job_logs_job_id_created ON job_logs(job_id, created)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_overlay_shares_overlay_created') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='overlay_shares' AND column_name='overlay_id') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='overlay_shares' AND column_name='created')
  THEN
    EXECUTE 'CREATE INDEX idx_overlay_shares_overlay_created ON overlay_shares(overlay_id, created)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='equity_snapshots') AND
     NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_equity_snapshots_source_ts') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='equity_snapshots' AND column_name='source') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='equity_snapshots' AND column_name='ts')
  THEN
    EXECUTE 'CREATE INDEX idx_equity_snapshots_source_ts ON equity_snapshots(source, ts)';
  END IF;
END$$;
