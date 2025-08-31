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
