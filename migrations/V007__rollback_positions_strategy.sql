-- V007__rollback_positions_strategy.sql
DO $$
BEGIN
  -- Pirma drop indeksą, jei yra
  IF EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_positions_strategy_symbol'
  ) THEN
    EXECUTE 'DROP INDEX idx_positions_strategy_symbol';
  END IF;

  -- Tada drop stulpelį, jei yra
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='positions' AND column_name='strategy'
  ) THEN
    EXECUTE 'ALTER TABLE positions DROP COLUMN strategy';
  END IF;
END$$;
