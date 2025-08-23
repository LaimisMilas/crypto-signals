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
