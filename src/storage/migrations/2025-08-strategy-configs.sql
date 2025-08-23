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
