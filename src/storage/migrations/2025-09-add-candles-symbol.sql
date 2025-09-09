BEGIN;

ALTER TABLE public.candles
  ADD COLUMN IF NOT EXISTS symbol TEXT,
  DROP CONSTRAINT IF EXISTS candles_ts_key;

UPDATE public.candles
SET symbol = COALESCE(symbol, 'BTCUSDT');

ALTER TABLE public.candles
  ALTER COLUMN symbol SET NOT NULL;

ALTER TABLE public.candles
  ADD CONSTRAINT candles_symbol_ts_key UNIQUE(symbol, ts);

CREATE INDEX IF NOT EXISTS idx_candles_symbol_ts ON public.candles(symbol, ts);

COMMIT;

