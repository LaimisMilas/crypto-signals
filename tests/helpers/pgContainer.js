import { GenericContainer } from 'testcontainers';
import { Client } from 'pg';

async function createMinimalSchema(client) {
  // candles table with unique symbol+ts and helpful indexes
  await client.query(`
    CREATE TABLE IF NOT EXISTS candles(
      id SERIAL PRIMARY KEY,
      ts BIGINT NOT NULL,
      open DOUBLE PRECISION,
      high DOUBLE PRECISION,
      low DOUBLE PRECISION,
      close DOUBLE PRECISION,
      volume DOUBLE PRECISION,
      symbol TEXT NOT NULL,
      UNIQUE(symbol, ts)
    );
    CREATE INDEX IF NOT EXISTS idx_candles_symbol_ts ON candles(symbol, ts);
    CREATE INDEX IF NOT EXISTS idx_candles_ts ON candles(ts);
  `);

  // artifacts table used by artifacts API
  await client.query(`
    CREATE TABLE IF NOT EXISTS job_artifacts(
      id BIGSERIAL PRIMARY KEY,
      job_id BIGINT NOT NULL,
      kind TEXT,
      label TEXT,
      path TEXT NOT NULL,
      size_bytes BIGINT,
      remote_url TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_job_artifacts_job ON job_artifacts(job_id);
  `);

  // jobs table for job runner
  await client.query(`
    DO $$ BEGIN
      CREATE TYPE job_type   AS ENUM ('backtest','optimize','walkforward');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
      CREATE TYPE job_status AS ENUM ('queued','running','succeeded','failed','canceled');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    CREATE TABLE IF NOT EXISTS jobs(
      id BIGSERIAL PRIMARY KEY,
      type       job_type   NOT NULL,
      status     job_status NOT NULL DEFAULT 'queued',
      priority   SMALLINT   NOT NULL DEFAULT 0,
      params     JSONB      NOT NULL DEFAULT '{}',
      progress   REAL       NOT NULL DEFAULT 0,
      error      TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      started_at TIMESTAMPTZ,
      finished_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON jobs(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC);
  `);

  // paper trades table for analytics/portfolio
  await client.query(`
    CREATE TABLE IF NOT EXISTS paper_trades(
      id SERIAL PRIMARY KEY,
      symbol TEXT NOT NULL,
      side TEXT NOT NULL,
      qty DOUBLE PRECISION NOT NULL,
      entry_price DOUBLE PRECISION NOT NULL,
      pnl DOUBLE PRECISION,
      strategy TEXT,
      opened_at BIGINT,
      closed_at BIGINT
    );
    CREATE INDEX IF NOT EXISTS idx_pt_closed ON paper_trades(closed_at);
    CREATE INDEX IF NOT EXISTS idx_pt_opened ON paper_trades(opened_at);
  `);

  // live baseline snapshots
  await client.query(`
    CREATE TABLE IF NOT EXISTS equity_snapshots(
      ts BIGINT PRIMARY KEY,
      equity DOUBLE PRECISION NOT NULL,
      source TEXT NOT NULL DEFAULT 'live',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_equity_snapshots_ts ON equity_snapshots(ts);
    CREATE INDEX IF NOT EXISTS idx_equity_snapshots_source_ts ON equity_snapshots(source, ts);
  `);
}

async function seedBasic(client) {
  await client.query(`
    INSERT INTO candles(ts, open, high, low, close, volume, symbol)
    VALUES
      (1000,100,110,95,105,1000,'BTCUSDT'),
      (2000,105,115,100,112,900,'BTCUSDT'),
      (3000,112,118,108,116,800,'BTCUSDT'),
      (1000,50,55,48,52,5000,'ETHUSDT'),
      (2000,52,57,51,56,4800,'ETHUSDT'),
      (3000,56,60,55,59,4600,'ETHUSDT')
    ON CONFLICT DO NOTHING;
  `);

  await client.query(`
    INSERT INTO paper_trades(symbol,side,qty,entry_price,pnl,strategy,opened_at,closed_at) VALUES
      ('BTCUSDT','LONG', 0.5, 100, 10, 'ema', 1500, 2000),
      ('ETHUSDT','SHORT',1.0, 55, -5, 'adx', 2500, 3000);
    INSERT INTO paper_trades(symbol,side,qty,entry_price,strategy,opened_at) VALUES
      ('BTCUSDT','LONG', 0.2, 110, 'ema', 2800);
  `);

  await client.query(`
    INSERT INTO equity_snapshots(ts,equity,source) VALUES
      (1000,1000,'live'),(2000,1040,'live'),(3000,1085,'live')
    ON CONFLICT (ts) DO UPDATE SET equity=EXCLUDED.equity;
  `);
}

export async function startPgWithSchema() {
  const container = await new GenericContainer('postgres:15-alpine')
    .withEnvironment({
      POSTGRES_PASSWORD: 'test',
      POSTGRES_USER: 'test',
      POSTGRES_DB: 'cs_test'
    })
    .withExposedPorts(5432)
    .start();

  const host = container.getHost();
  const port = container.getMappedPort(5432);
  const url = `postgres://test:test@${host}:${port}/cs_test`;

  const client = new Client({ connectionString: url });
  await client.connect();

  // Use minimal schema setup for tests instead of project migrations
  await createMinimalSchema(client);
  await seedBasic(client);
  await client.end();

  return { container, DATABASE_URL: url };
}
