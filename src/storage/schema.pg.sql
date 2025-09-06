-- Schema generated from migrations
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
CREATE TABLE IF NOT EXISTS equity_snapshots (
  ts           BIGINT PRIMARY KEY,         -- epoch millis
  equity       DOUBLE PRECISION NOT NULL,
  source       TEXT NOT NULL DEFAULT 'live',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equity_snapshots_ts ON equity_snapshots(ts);
CREATE INDEX IF NOT EXISTS idx_equity_snapshots_source_ts ON equity_snapshots(source, ts);
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
CREATE TABLE IF NOT EXISTS overlay_shares (
  id BIGSERIAL PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_overlay_shares_created ON overlay_shares(created_at DESC);
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
CREATE TABLE IF NOT EXISTS positions (
                                       ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  symbol TEXT NOT NULL,
  position_amt NUMERIC NOT NULL,
  entry_price NUMERIC,
  unrealized_pnl NUMERIC,
  mode TEXT, -- cross/isolated
  PRIMARY KEY (ts, symbol)
  );
CREATE INDEX IF NOT EXISTS idx_positions_symbol ON positions(symbol);
ALTER TABLE paper_trades
  ADD COLUMN IF NOT EXISTS strategy TEXT,
  ADD COLUMN IF NOT EXISTS params JSONB;

CREATE INDEX IF NOT EXISTS idx_paper_trades_strategy ON paper_trades (strategy);
CREATE INDEX IF NOT EXISTS idx_paper_trades_params_gin ON paper_trades USING GIN (params jsonb_path_ops);
CREATE TABLE IF NOT EXISTS strategy_configs (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  active JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS strategy_presets (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  strategy_id TEXT NOT NULL,
  params JSONB NOT NULL,
  symbols TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO strategy_configs (id, active)
VALUES (1, '{
  "strategies": [
    { "id":"ema", "params":{"fast":12,"slow":26,"atrMult":2}, "symbols":["SOLUSDT","BTCUSDT"] }
  ],
  "updated_at": null
}') ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_strategy_presets_strategy ON strategy_presets(strategy_id);
-- 1) Išplėsti paper_trades planuotais laukais
ALTER TABLE paper_trades
  ADD COLUMN IF NOT EXISTS planned_entry NUMERIC,
  ADD COLUMN IF NOT EXISTS planned_sl NUMERIC,
  ADD COLUMN IF NOT EXISTS planned_tp NUMERIC,
  ADD COLUMN IF NOT EXISTS planned_qty NUMERIC,
  ADD COLUMN IF NOT EXISTS risk_usd NUMERIC,
  ADD COLUMN IF NOT EXISTS atr NUMERIC,
  ADD COLUMN IF NOT EXISTS exit_reason TEXT,          -- 'tp_hit' | 'sl_hit' | 'manual' | null
  ADD COLUMN IF NOT EXISTS fees_usd NUMERIC,          -- kaupiamos komisijos, jei turime
  ADD COLUMN IF NOT EXISTS slippage_entry_bps NUMERIC,
  ADD COLUMN IF NOT EXISTS slippage_exit_bps NUMERIC,
  ADD COLUMN IF NOT EXISTS mae_usd NUMERIC,
  ADD COLUMN IF NOT EXISTS mfe_usd NUMERIC,
  ADD COLUMN IF NOT EXISTS r_multiple NUMERIC,
  ADD COLUMN IF NOT EXISTS hold_ms BIGINT;

-- 2) Fills normalizavimui (jei dar neturime)
CREATE TABLE IF NOT EXISTS trade_fills (
                                         id BIGSERIAL PRIMARY KEY,
                                         trade_id BIGINT REFERENCES paper_trades(id) ON DELETE CASCADE,
  side TEXT,                      -- BUY/SELL
  price NUMERIC,
  qty NUMERIC,
  commission NUMERIC,             -- jei WS/REST pateikia
  commission_asset TEXT,
  is_entry BOOLEAN,               -- true: entry, false: exit (SL/TP/Manual)
  ts TIMESTAMPTZ NOT NULL DEFAULT now()
  );
CREATE INDEX IF NOT EXISTS idx_trade_fills_trade_id ON trade_fills(trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_fills_ts ON trade_fills(ts);

-- 3) Pagalba MAE/MFE: indeksai candles lentelei (jei trūksta)
CREATE INDEX IF NOT EXISTS idx_candles_symbol_ts ON candles(symbol, ts);
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
-- 1) Konfigūracija (paprasta JSON, viena eilutė)
CREATE TABLE IF NOT EXISTS risk_limits (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  config JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default config (idempotent)
INSERT INTO risk_limits (id, config)
VALUES (1, '{
  "maxDailyLossPct": 3.0,
  "maxIntradayDrawdownPct": 5.0,
  "riskPerTradePctCap": 1.5,
  "maxOpenPositionsGlobal": 5,
  "maxOpenPerSymbol": 2,
  "maxExposurePctPerSymbol": 30.0,
  "maxLeveragePerSymbol": 10,
  "allowedSymbols": [],
  "blockedSymbols": [],
  "allowedSides": ["LONG","SHORT"],
  "sessions": {
    "timezone": "Europe/Vilnius",
    "weekdays": [1,2,3,4,5,6,7],
    "windows": [{"start":"00:00","end":"23:59"}]
  },
  "circuitBreakers": {
    "atrVolPctLimit": 5.0,
    "pingFailuresToHalt": 3,
    "haltCooldownMin": 15
  }
}') ON CONFLICT (id) DO NOTHING;

-- 2) Būsena ir dienos metrikos
CREATE TABLE IF NOT EXISTS risk_state (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  state TEXT NOT NULL DEFAULT 'RUNNING',          -- RUNNING | HALTED
  halt_reason TEXT,
  day_start DATE,
  equity_day_start NUMERIC,
  equity_day_high NUMERIC,
  realized_pnl_today NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) Įvykių/„trip“ logas
CREATE TABLE IF NOT EXISTS risk_halts (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  action TEXT NOT NULL,             -- 'HALT' | 'RESUME' | 'WARNING'
  reason TEXT,
  details JSONB
);

CREATE INDEX IF NOT EXISTS idx_risk_halts_ts ON risk_halts(ts);
-- Ensure fast filters
CREATE INDEX IF NOT EXISTS idx_paper_trades_closed_at ON paper_trades (closed_at);
CREATE INDEX IF NOT EXISTS idx_paper_trades_status ON paper_trades (status);

-- Notification function
CREATE OR REPLACE FUNCTION notify_equity_update() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('equity_update', COALESCE(NEW.symbol,'') || '|' || COALESCE(NEW.strategy,''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on CLOSED trades
DROP TRIGGER IF EXISTS trg_equity_update ON paper_trades;
CREATE TRIGGER trg_equity_update
AFTER INSERT OR UPDATE OF status ON paper_trades
FOR EACH ROW
WHEN (NEW.status = 'CLOSED')
EXECUTE FUNCTION notify_equity_update();
BEGIN;

ALTER TABLE paper_trades
  ADD COLUMN IF NOT EXISTS strategy TEXT,
  ADD COLUMN IF NOT EXISTS params JSONB,
  ADD COLUMN IF NOT EXISTS symbol TEXT,
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pnl NUMERIC,
  ADD COLUMN IF NOT EXISTS pnl_pct NUMERIC,
  ADD COLUMN IF NOT EXISTS side TEXT,
  ADD COLUMN IF NOT EXISTS qty NUMERIC,
  ADD COLUMN IF NOT EXISTS entry_price NUMERIC,
  ADD COLUMN IF NOT EXISTS exit_price NUMERIC,
  ADD COLUMN IF NOT EXISTS status TEXT;

CREATE INDEX IF NOT EXISTS idx_paper_trades_closed_at ON paper_trades (closed_at);
CREATE INDEX IF NOT EXISTS idx_paper_trades_symbol ON paper_trades (symbol);
CREATE INDEX IF NOT EXISTS idx_paper_trades_strategy ON paper_trades (strategy);
CREATE INDEX IF NOT EXISTS idx_paper_trades_status ON paper_trades (status);
CREATE INDEX IF NOT EXISTS idx_paper_trades_params_gin ON paper_trades USING GIN (params jsonb_path_ops);

CREATE TABLE IF NOT EXISTS equity_history (
  ts TIMESTAMPTZ NOT NULL,
  symbol TEXT,
  strategy TEXT,
  params JSONB,
  equity NUMERIC NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_equity_history_ts ON equity_history (ts);
CREATE INDEX IF NOT EXISTS idx_equity_history_symbol ON equity_history (symbol);
CREATE INDEX IF NOT EXISTS idx_equity_history_strategy ON equity_history (strategy);
CREATE INDEX IF NOT EXISTS idx_equity_history_params_gin ON equity_history USING GIN (params jsonb_path_ops);

COMMIT;
BEGIN;

-- =========================
-- 1) Price candles
-- =========================
CREATE TABLE IF NOT EXISTS public.candles (
                                            id      SERIAL PRIMARY KEY,
                                            ts      BIGINT NOT NULL UNIQUE,                       -- ms since epoch
                                            open    DOUBLE PRECISION,
                                            high    DOUBLE PRECISION,
                                            low     DOUBLE PRECISION,
                                            close   DOUBLE PRECISION,
                                            volume  DOUBLE PRECISION
);

CREATE INDEX IF NOT EXISTS idx_candles_ts ON public.candles(ts);


-- =========================
-- 2) Signals (backtest / research)
-- =========================
CREATE TABLE IF NOT EXISTS public.signals (
                                            id         SERIAL PRIMARY KEY,
                                            ts         BIGINT NOT NULL,                           -- ms since epoch
                                            type       TEXT NOT NULL CHECK (type IN ('BUY','SELL')),
  price      DOUBLE PRECISION NOT NULL,
  rsi        DOUBLE PRECISION,
  atr        DOUBLE PRECISION,
  aroon_up   DOUBLE PRECISION,
  aroon_down DOUBLE PRECISION,
  reason     TEXT
  );

CREATE INDEX IF NOT EXISTS idx_signals_ts ON public.signals(ts);


-- =========================
-- 3) Subscribers (Stripe)
-- =========================
CREATE TABLE IF NOT EXISTS public.subscribers (
                                                id               SERIAL PRIMARY KEY,
                                                email            TEXT,
                                                subscription_id  TEXT,
                                                status           TEXT,                                -- active, trialing, canceled, past_due, unpaid
                                                created_at       BIGINT                                -- ms since epoch
);

-- Naudinga Stripe webhook’ams ir administravimui
CREATE UNIQUE INDEX IF NOT EXISTS idx_subs_subscription_unique ON public.subscribers(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subs_status      ON public.subscribers(status);
CREATE INDEX IF NOT EXISTS idx_subs_created_at  ON public.subscribers(created_at);


-- =========================
-- 4) Paper trades (live paper trading)
-- =========================
CREATE TABLE IF NOT EXISTS public.paper_trades (
                                                 id           SERIAL PRIMARY KEY,
                                                 ts           BIGINT NOT NULL,                         -- trade timestamp (ms). Iki šiol naudota kaip "closed time"
                                                 side         TEXT NOT NULL CHECK (side IN ('BUY','SELL')),
  price        DOUBLE PRECISION NOT NULL,               -- paskutinio veiksmo kaina (pagal tavo logiką)
  size         DOUBLE PRECISION,                        -- pozicijos dydis
  pnl          DOUBLE PRECISION,                        -- P&L kai uždaryta
  entry_price  DOUBLE PRECISION,
  exit_price   DOUBLE PRECISION,
  status       TEXT DEFAULT 'OPEN'
  CHECK (status IN ('OPEN','CLOSED')),
  trail_top    DOUBLE PRECISION,
  tp_pct       DOUBLE PRECISION,
  sl_pct       DOUBLE PRECISION,
  trail_pct    DOUBLE PRECISION,
  risk_pct     DOUBLE PRECISION
  );

-- Nauji laukai, kurių gali prireikti analytics / filtrams
ALTER TABLE public.paper_trades
  ADD COLUMN IF NOT EXISTS symbol     TEXT,
  ADD COLUMN IF NOT EXISTS opened_at  BIGINT,           -- ms since epoch (pozicijos atidarymo laikas; bus naudinga ateičiai)
  ADD COLUMN IF NOT EXISTS closed_at  BIGINT;           -- ms since epoch (pozicijos uždarymo laikas; analytics naudoja)

-- Minimalus "backfill": jei trade uždarytas, bet closed_at tuščias, naudok istorinį ts
UPDATE public.paper_trades
SET closed_at = ts
WHERE status = 'CLOSED'
  AND closed_at IS NULL;

-- Indeksai greitoms užklausoms (/live, /analytics, SSE)
CREATE INDEX IF NOT EXISTS idx_paper_trades_ts           ON public.paper_trades(ts);
CREATE INDEX IF NOT EXISTS idx_paper_trades_status       ON public.paper_trades(status);
CREATE INDEX IF NOT EXISTS idx_paper_trades_closed_at    ON public.paper_trades(closed_at);
CREATE INDEX IF NOT EXISTS idx_paper_trades_symbol       ON public.paper_trades(symbol);
-- Kombinuotas dažnai naudingas: status + closed_at
CREATE INDEX IF NOT EXISTS idx_paper_trades_status_closed_at ON public.paper_trades(status, closed_at);

COMMIT;
ALTER TABLE paper_trades
  ADD COLUMN IF NOT EXISTS entry_price DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS exit_price DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('OPEN','CLOSED')) DEFAULT 'OPEN',
  ADD COLUMN IF NOT EXISTS trail_top DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS tp_pct DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS sl_pct DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS trail_pct DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS risk_pct DOUBLE PRECISION;
