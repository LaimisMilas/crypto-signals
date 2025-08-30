-- V006__schema_delta.sql
-- Pridedam multi-strategy stulpelį į positions ir indeksą.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='positions' AND column_name='strategy'
  ) THEN
    ALTER TABLE positions ADD COLUMN strategy text;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='positions' AND column_name='strategy'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_positions_strategy_symbol'
  ) THEN
    CREATE INDEX idx_positions_strategy_symbol ON positions(strategy, symbol);
  END IF;
END$$;
