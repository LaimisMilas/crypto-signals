import fs from 'fs/promises';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import { db } from './storage/db.js';
import { createSingleUseInviteLink } from './notify/telegram.js';
import { createCheckoutSession, stripeWebhook } from './payments/stripe.js';
import { startLive, stopLive, resetLive, getLiveState, getLiveConfig, setLiveConfig } from './live.js';
import { ingestOnce, getIngestHealth } from './ingest.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'client', 'public');
const app = express();

app.use(cors());
app.use(cookieParser());

// Stripe webhook must use raw body
app.post('/webhook/stripe', bodyParser.raw({ type: 'application/json' }), stripeWebhook);

// JSON body for general APIs
app.use(bodyParser.json());

function bool(v) { return !!(v && String(v).length); }

app.head('/health', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.status(200).end();
});

app.get('/health', async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  const mem = process.memoryUsage();
  let dbOk = false;
  try {
    const client = await db.connect();
    try {
      await client.query('SELECT 1');
      dbOk = true;
    } finally {
      client.release();
    }
  } catch (_) {
    dbOk = false;
  }
  res.json({
    status: (dbOk ? 'ok' : 'degraded'),
    uptimeSec: Math.round(process.uptime()),
    memoryMB: {
      rss: Math.round(mem.rss / (1024*1024)),
      heapUsed: Math.round(mem.heapUsed / (1024*1024)),
    },
    env: {
      DATABASE_URL: bool(process.env.DATABASE_URL),
      TELEGRAM_BOT_TOKEN: bool(process.env.TELEGRAM_BOT_TOKEN),
      STRIPE_SECRET: bool(process.env.STRIPE_SECRET),
      STRIPE_WEBHOOK_SECRET: bool(process.env.STRIPE_WEBHOOK_SECRET),
    },
    db: { ok: dbOk }
  });
});

app.get('/health/ingest', async (_req, res) => {
  try {
    const h = await getIngestHealth();
    res.json({ ok: true, ...h });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post('/ingest', async (req, res) => {
  try {
    const tk = process.env.INGEST_TOKEN;
    if (tk) {
      const auth = req.headers['authorization'] || '';
      if (auth !== `Bearer ${tk}`) {
        return res.status(401).json({ ok: false, error: 'unauthorized' });
      }
    }
    const r = await ingestOnce();
    res.json({ ok: true, ...r });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.get('/version', async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  let pkg = { name: 'crypto-signals', version: '0.0.0' };
  try {
    const text = await fs.readFile(path.join(__dirname, '..', 'package.json'), 'utf-8');
    pkg = JSON.parse(text);
  } catch {}
  res.json({
    name: pkg.name,
    version: pkg.version,
    git: process.env.GIT_SHA || null,
    builtAt: process.env.BUILD_TIME || null,
  });
});

app.get('/download/:file', async (req, res) => {
  const allow = new Set([
    'backtest.csv',
    'optimize.csv',
    'walkforward-agg.csv',
    'walkforward-summary.json',
    'metrics.json'
  ]);
  const { file } = req.params;
  if (!allow.has(file)) {
    return res.status(404).json({ error: 'Not found' });
  }
  try {
    const full = path.join(publicDir, file);
    await fs.access(full);
    res.setHeader('Content-Disposition', `attachment; filename="${file}"`);
    res.sendFile(full);
  } catch {
    res.status(404).json({ error: 'Not found' });
  }
});

// Latest signal
app.get('/signals/latest', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM signals ORDER BY ts DESC LIMIT 1');
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stripe checkout
app.post('/api/checkout-session', createCheckoutSession);

app.get('/api/telegram-invite', async (req, res) => {
  try {
    const email = (req.query.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'email_required' });

    const { rows } = await db.query(
      `SELECT subscription_id, status FROM subscribers
       WHERE email = $1 ORDER BY id DESC LIMIT 1`,
      [email]
    );
    const row = rows[0];
    if (!row) return res.status(404).json({ error: 'not_found' });
    if (row.status !== 'active' && row.status !== 'trialing')
      return res.status(403).json({ error: 'not_active' });

    try {
      const invite = await createSingleUseInviteLink();
      return res.json({ invite });
    } catch (e) {
      console.error('invite link error:', e.message);
      return res.status(500).json({ error: 'invite_failed' });
    }
  } catch (e) {
    return res.status(500).json({ error: 'server_error' });
  }
});

app.get('/live', async (_req, res) => res.json(await getLiveState()));
app.post('/live/start', async (_req, res) => { await startLive(); res.json({ ok: true }); });
app.post('/live/stop', async (_req, res) => { await stopLive(); res.json({ ok: true }); });
app.delete('/live/trades', async (_req, res) => { await resetLive(); res.json({ ok: true }); });
app.get('/live/config', async (_req, res) => {
  const cfg = await getLiveConfig();
  res.json(cfg);
});
app.post('/live/config', express.json(), async (req, res) => {
  const saved = await setLiveConfig(req.body || {});
  res.json(saved);
});

// --- Analytics dashboard ---

// Serve static analytics assets (CSV/HTML) from client/public
app.get('/analytics', (_req, res) => {
  res.sendFile(path.join(publicDir, 'analytics.html'));
});

app.get('/analytics/data', async (req, res) => {
  const parseDate = (s) => {
    const t = Date.parse(String(s));
    return Number.isNaN(t) ? null : t;
  };
  const from = req.query.from ? parseDate(req.query.from) : null;
  const to = req.query.to ? parseDate(req.query.to) : null;
  let symbol = req.query.symbol ? String(req.query.symbol).trim() : null;
  if (!symbol) symbol = null;

  res.set('Cache-Control', 'no-store');

  let symbols = [];
  try {
    const { rows } = await db.query(
      'SELECT DISTINCT symbol FROM paper_trades WHERE symbol IS NOT NULL ORDER BY symbol ASC'
    );
    symbols = rows.map(r => r.symbol);
  } catch (e) {
    console.error('[/analytics/data] symbols error:', e);
  }

  let trades = [];
  try {
    // Recommended DB indices for performance:
    // CREATE INDEX IF NOT EXISTS idx_trades_closed_at ON paper_trades (closed_at);
    // CREATE INDEX IF NOT EXISTS idx_trades_symbol ON paper_trades (symbol);
    const { rows } = await db.query(
      `SELECT id, symbol, opened_at, closed_at, entry_price, exit_price, pnl
       FROM paper_trades
       WHERE status='CLOSED'
         AND ($1::bigint IS NULL OR closed_at >= $1)
         AND ($2::bigint IS NULL OR closed_at <  $2)
         AND ($3::text IS NULL OR symbol = $3)
       ORDER BY closed_at ASC
       LIMIT 5000`,
      [from, to, symbol]
    );
    trades = rows.map(r => ({
      id: r.id,
      symbol: r.symbol,
      opened_at: Number(r.opened_at),
      closed_at: Number(r.closed_at),
      entry_price: Number(r.entry_price),
      exit_price: Number(r.exit_price),
      pnl: Number(r.pnl)
    }));
  } catch (e) {
    console.error('[/analytics/data] error:', e);
    return res.status(500).json({ ok: false, error: 'db_error' });
  }

  let equity = [];
  let sum = 0;
  let peak = 0;
  let maxDrawdown = 0;
  let wins = 0;
  for (const t of trades) {
    sum += t.pnl || 0;
    equity.push({ ts: t.closed_at, equity: sum });
    if (sum > peak) peak = sum;
    const dd = peak - sum;
    if (dd > maxDrawdown) maxDrawdown = dd;
    if (t.pnl > 0) wins++;
  }

  const summary = {
    trades: trades.length,
    pnl: sum,
    winRate: trades.length ? (wins / trades.length) * 100 : 0,
    maxDrawdown
  };

  res.json({ ok: true, symbols, summary, equity, trades });
});

app.get('/analytics/trades.csv', async (req, res) => {
  const parseDate = (s) => {
    const t = Date.parse(String(s));
    return Number.isNaN(t) ? null : t;
  };
  const from = req.query.from ? parseDate(req.query.from) : null;
  const to = req.query.to ? parseDate(req.query.to) : null;
  let symbol = req.query.symbol ? String(req.query.symbol).trim() : null;
  if (!symbol) symbol = null;

  res.set('Cache-Control', 'no-store');

  try {
    const { rows } = await db.query(
      `SELECT id, symbol, opened_at, closed_at, entry_price, exit_price, pnl
       FROM paper_trades
       WHERE status='CLOSED'
         AND ($1::bigint IS NULL OR closed_at >= $1)
         AND ($2::bigint IS NULL OR closed_at <  $2)
         AND ($3::text IS NULL OR symbol = $3)
       ORDER BY closed_at ASC
       LIMIT 50000`,
      [from, to, symbol]
    );
    const header = 'id,symbol,opened_at,closed_at,entry_price,exit_price,pnl\n';
    const csv = header + rows.map(r => [r.id, r.symbol, r.opened_at, r.closed_at, r.entry_price, r.exit_price, r.pnl].join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="trades.csv"');
    res.send(csv);
  } catch (e) {
    console.error('[/analytics/trades.csv] error:', e);
    res.status(500).json({ ok: false, error: 'db_error' });
  }
});

app.use('/analytics', express.static(publicDir));

// Static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// SPA fallback — bet koks kitas GET, kuris nepateko į API/static, grąžina index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on :${PORT}`);
});
