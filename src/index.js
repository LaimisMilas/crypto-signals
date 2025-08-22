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
// Alias db pool for clarity
const pool = db;

async function loadClosedPnLSince(fromMs = null) {
  const q = `
    SELECT ts, pnl
    FROM paper_trades
    WHERE status='CLOSED'
      AND ($1::bigint IS NULL OR ts >= $1::bigint)
    ORDER BY ts ASC
    LIMIT 20000
  `;
  const { rows } = await db.query(q, [fromMs]);
  return rows.map(r => ({ ts: Number(r.ts), pnl: Number(r.pnl ?? 0) }));
}

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

// GET /live/equity?from=YYYY-MM-DD
app.get('/live/equity', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const fromStr = (req.query.from || '').toString().trim();
  const fromMs = fromStr ? (Number.isNaN(Date.parse(fromStr)) ? null : Date.parse(fromStr)) : null;

  try {
    const rows = await loadClosedPnLSince(fromMs);
    let eq = 0, peak = -Infinity, maxDD = 0;
    const equity = rows.map(r => {
      eq += r.pnl || 0;
      if (eq > peak) peak = eq;
      const dd = peak - eq;
      if (dd > maxDD) maxDD = dd;
      return { ts: r.ts, equity: eq };
    });

    return res.json({
      ok: true,
      from: fromMs,
      points: equity,
      lastTs: equity.length ? equity[equity.length - 1].ts : null,
      lastEq: equity.length ? equity[equity.length - 1].equity : 0,
      maxDrawdown: Number(maxDD.toFixed(2)),
    });
  } catch (e) {
    console.error('[/live/equity] error:', e);
    return res.status(500).json({ ok: false, error: 'db_error' });
  }
});

// GET /live/equity/stream?from=YYYY-MM-DD
// Server-Sent Events srautas: kas 2s tikrina naujus CLOSED trade'us, pildo equity taškus ir siunčia tik naujus
app.get('/live/equity/stream', async (req, res) => {
  // SSE antraštės
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-store',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const send = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const fromStr = (req.query.from || '').toString().trim();
  let fromMs = fromStr ? (Number.isNaN(Date.parse(fromStr)) ? null : Date.parse(fromStr)) : null;

  let lastTs = fromMs || null;
  let eq = 0; // sukaupsim pagal atsiųstus taškus šiame ryšyje

  try {
    // inicialus dump nuo fromMs
    const rows = await loadClosedPnLSince(fromMs);
    const initPoints = [];
    for (const r of rows) {
      eq += r.pnl || 0;
      initPoints.push({ ts: r.ts, equity: eq });
      lastTs = r.ts;
    }
    send('init', {
      ok: true,
      points: initPoints,
      lastTs,
      lastEq: eq,
    });
  } catch (e) {
    console.error('[/live/equity/stream] init error:', e);
    send('error', { ok: false, error: 'db_error' });
  }

  // polling ciklas kas 2s
  const timer = setInterval(async () => {
    try {
      // imame naujesnius nei lastTs
      const rows = await loadClosedPnLSince(lastTs != null ? (lastTs + 1) : null);
      const newPoints = [];
      for (const r of rows) {
        eq += r.pnl || 0;
        newPoints.push({ ts: r.ts, equity: eq });
        lastTs = r.ts;
      }
      if (newPoints.length) {
        send('tick', { points: newPoints, lastTs, lastEq: eq });
      }
    } catch (e) {
      console.error('[/live/equity/stream] poll error:', e);
      send('error', { ok: false, error: 'db_error' });
    }
  }, 2000);

  // ryšio uždarymas
  req.on('close', () => {
    clearInterval(timer);
    try { res.end(); } catch (_) {}
  });
});

app.get('/live/history', async (req, res) => {
  const parseDateMs = (v) => {
    if (!v) return null;
    const t = Date.parse(String(v));
    return Number.isNaN(t) ? null : t;
  };

  const fromMs = parseDateMs(req.query.from);
  const toMs = parseDateMs(req.query.to);

  res.set('Cache-Control', 'no-store');

  try {
    const q = `
      SELECT id, ts, entry_price, exit_price, pnl
      FROM paper_trades
      WHERE status='CLOSED'
        AND ($1::bigint IS NULL OR ts >= $1::bigint)
        AND ($2::bigint IS NULL OR ts <  $2::bigint)
      ORDER BY ts ASC
      LIMIT 5000
    `;
    const { rows } = await db.query(q, [fromMs, toMs]);
    const trades = rows.map(r => ({
      id: Number(r.id),
      ts: Number(r.ts),
      entry_price: Number(r.entry_price ?? 0),
      exit_price: Number(r.exit_price ?? 0),
      pnl: Number(r.pnl ?? 0),
    }));

    const equity = [];
    let eq = 0;
    let peak = -Infinity;
    let maxDD = 0;
    let wins = 0;
    for (const t of trades) {
      eq += t.pnl || 0;
      if (eq > peak) peak = eq;
      const dd = peak - eq;
      if (dd > maxDD) maxDD = dd;
      if ((t.pnl || 0) > 0) wins++;
      equity.push({ ts: t.ts, equity: Number(eq.toFixed(2)) });
    }

    const summary = {
      trades: trades.length,
      pnl: Number(eq.toFixed(2)),
      winRate: trades.length ? Number((wins / trades.length * 100).toFixed(2)) : 0,
      maxDrawdown: Number(maxDD.toFixed(2)),
    };

    const symbol = process.env.SYMBOL || 'BTCUSDT';

    res.json({ ok: true, symbol, trades, equity, summary });
  } catch (e) {
    console.error('[/live/history] db error:', e);
    res.status(500).json({ ok: false, error: 'db_error' });
  }
});

// --- Analytics dashboard ---

// Serve static analytics assets (CSV/HTML) from client/public
app.get('/analytics', (_req, res) => {
  res.sendFile(path.join(publicDir, 'analytics.html'));
});

app.get('/analytics/data', async (req, res) => {
  const parseDateMs = (v) => {
    if (!v) return null;
    const t = Date.parse(String(v));
    return Number.isNaN(t) ? null : t;
    // from/to naudosim kaip ms -> Postgres BIGINT
  };

  const fromMs = parseDateMs(req.query.from);
  const toMs   = parseDateMs(req.query.to);

  // Schema neturi symbol; UI’ui grąžinam bent vieną reikšmę
  const defaultSymbol = process.env.SYMBOL || 'BTCUSDT';
  const uiSymbol = (req.query.symbol || '').toString().trim() || defaultSymbol;

  res.set('Cache-Control', 'no-store');

  // symbols drop-down’ui
  const symbols = [defaultSymbol];

  // Pasiimam tik CLOSED įrašus, ts naudojam kaip "closed_at"
  let trades = [];
  try {
    const q = `
      SELECT id, ts, entry_price, exit_price, pnl
      FROM paper_trades
      WHERE status = 'CLOSED'
        AND ($1::bigint IS NULL OR ts >= $1::bigint)
        AND ($2::bigint IS NULL OR ts <  $2::bigint)
      ORDER BY ts ASC
      LIMIT 5000
    `;
    const { rows } = await db.query(q, [fromMs, toMs]);
    trades = rows.map(r => ({
      id: r.id,
      symbol: uiSymbol,                 // dekoratyvinis, kol lentelėje nėra symbol
      opened_at: null,                  // neturime atidarymo timestamp
      closed_at: Number(r.ts),          // ts = uždarymo momentas
      entry_price: Number(r.entry_price ?? 0),
      exit_price: Number(r.exit_price ?? 0),
      pnl: Number(r.pnl ?? 0),
    }));
  } catch (e) {
    console.error('[/analytics/data] db error:', e);
    return res.status(500).json({ ok: false, error: 'db_error' });
  }

  // Equity + statistika
  let equity = [];
  let eq = 0;
  let peak = -Infinity;
  let maxDD = 0;
  let wins = 0;

  for (const t of trades) {
    eq += t.pnl || 0;
    if (eq > peak) peak = eq;
    const dd = peak - eq;
    if (dd > maxDD) maxDD = dd;
    if ((t.pnl || 0) > 0) wins++;
    equity.push({ ts: t.closed_at, equity: eq });
  }

  const summary = {
    trades: trades.length,
    pnl: Number(eq.toFixed(2)),
    winRate: trades.length ? Number((wins / trades.length * 100).toFixed(2)) : 0,
    maxDrawdown: Number(maxDD.toFixed(2)),
  };

  return res.json({ ok: true, symbols, summary, equity, trades });
});

app.get('/analytics/trades.csv', async (req, res) => {
  try {
    const fromIso = req.query.from;
    const toIso = req.query.to;
    const symbolParam = req.query.symbol;

    const fromMs = Number.isFinite(Date.parse(fromIso)) ? Date.parse(fromIso) : null;
    const toMs   = Number.isFinite(Date.parse(toIso))   ? Date.parse(toIso)   : null;

    const defaultSymbol = process.env.SYMBOL || 'BTCUSDT';

    const client = await pool.connect();
    try {
      const q = `
        SELECT id, ts, entry_price, exit_price, pnl, status
        FROM paper_trades
        WHERE status='CLOSED'
          AND ($1::bigint IS NULL OR ts >= $1::bigint)
          AND ($2::bigint IS NULL OR ts <  $2::bigint)
        ORDER BY ts ASC
        LIMIT 50000
      `;
      const { rows } = await client.query(q, [fromMs, toMs]);

      const header = 'id,symbol,opened_at,closed_at,entry_price,exit_price,pnl';
      const lines = rows.map(r => {
        const sym = symbolParam || defaultSymbol;
        const openedAt = '';           // neturim – tuščia
        const closedAt = r.ts;         // ts naudojam kaip uždarymo laiką
        return [
          r.id,
          sym,
          openedAt,
          closedAt,
          Number(r.entry_price ?? 0),
          Number(r.exit_price ?? 0),
          Number(r.pnl ?? 0),
        ].join(',');
      });

      const csv = [header, ...lines].join('\\n');
      res.set('Cache-Control', 'no-store');
      res.set('Content-Type', 'text/csv; charset=utf-8');
      res.set('Content-Disposition', 'attachment; filename="trades.csv"');
      res.send(csv);
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('[/analytics/trades.csv] error:', e);
    res.status(500).send('internal_error');
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
