import { GenericContainer } from 'testcontainers';
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

async function runSqlFiles(client, dir) {
  const files = globSync('*.sql', { cwd: dir }).sort();
  for (const f of files) {
    const sql = fs.readFileSync(path.join(dir, f), 'utf8');
    await client.query(sql);
  }
}

async function seedBasic(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS candles(
      ts BIGINT PRIMARY KEY,
      open DOUBLE PRECISION,
      high DOUBLE PRECISION,
      low DOUBLE PRECISION,
      close DOUBLE PRECISION,
      volume DOUBLE PRECISION,
      symbol TEXT NOT NULL
    );
  `);
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
    CREATE TABLE IF NOT EXISTS paper_trades(
      id SERIAL PRIMARY KEY,
      symbol TEXT NOT NULL,
      side TEXT NOT NULL,
      qty DOUBLE PRECISION NOT NULL,
      entry_price DOUBLE PRECISION NOT NULL,
      pnl DOUBLE PRECISION,
      strategy TEXT,
      closed_at BIGINT
    );
  `);
  await client.query(`
    INSERT INTO paper_trades(symbol,side,qty,entry_price,pnl,strategy,closed_at) VALUES
      ('BTCUSDT','LONG', 0.5, 100, 10, 'ema', 2000),
      ('ETHUSDT','SHORT',1.0, 55,  -5, 'adx',  3000);
    INSERT INTO paper_trades(symbol,side,qty,entry_price,strategy) VALUES
      ('BTCUSDT','LONG', 0.2, 110, 'ema');
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS equity_snapshots(
      ts BIGINT PRIMARY KEY,
      equity DOUBLE PRECISION NOT NULL,
      source TEXT NOT NULL DEFAULT 'live',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await client.query(`
    INSERT INTO equity_snapshots(ts,equity,source) VALUES
      (1000,1000,'live'),(2000,1040,'live'),(3000,1085,'live')
    ON CONFLICT (ts) DO UPDATE SET equity=EXCLUDED.equity;
  `);
}

export async function startPgWithSchema() {
  const container = await new GenericContainer('postgres:15-alpine')
    .withExposedPorts(5432)
    .withEnvironment({
      POSTGRES_PASSWORD: 'test',
      POSTGRES_USER: 'test',
      POSTGRES_DB: 'cs_test'
    })
    .start();

  const host = container.getHost();
  const port = container.getMappedPort(5432);
  const url = `postgres://test:test@${host}:${port}/cs_test`;

  const client = new Client({ connectionString: url });
  await client.connect();

  const root = process.cwd();
  const schemaFile = path.resolve(root, 'src/storage/schema.pg.sql');
  if (fs.existsSync(schemaFile)) {
    const schemaSql = fs.readFileSync(schemaFile, 'utf8');
    await client.query(schemaSql);
  }

  const migDirs = [
    path.resolve(root, 'src/storage/migrations'),
    path.resolve(root, 'migrations')
  ];
  for (const dir of migDirs) {
    if (fs.existsSync(dir)) await runSqlFiles(client, dir);
  }

  await seedBasic(client);
  await client.end();

  return { container, DATABASE_URL: url };
}
