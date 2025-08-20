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

// --- /analytics route ---

// small CSV -> array of objects (numbers if possible)
function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map(x => x.trim());
    if (parts.length !== headers.length) continue;
    const obj = {};
    headers.forEach((h, idx) => {
      const v = parts[idx];
      const n = Number(v);
      obj[h] = Number.isFinite(n) ? n : v; // convert numerics
    });
    rows.push(obj);
  }
  return rows;
}

async function safeReadJson(file) {
  try {
    const data = await fs.readFile(path.join(publicDir, file), 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

async function safeReadCsv(file, limit = null) {
  try {
    const data = await fs.readFile(path.join(publicDir, file), 'utf-8');
    const rows = parseCsv(data);
    return Array.isArray(limit) ? rows.slice(0, limit) : (typeof limit === 'number' ? rows.slice(0, limit) : rows);
  } catch {
    return [];
  }
}

app.get('/analytics', async (_req, res) => {
  try {
    const backtest = await safeReadJson('metrics.json'); // may be null
    const optimize = await safeReadCsv('optimize.csv', 50); // array
    const walkforward = await safeReadJson('walkforward-summary.json'); // may be null

    res.json({
      backtest: backtest ?? {},
      optimize: optimize ?? [],
      walkforward: walkforward ?? {},
    });
  } catch (e) {
    console.error('[/analytics] error:', e);
    res.status(500).json({ error: 'analytics_failed' });
  }
});

// --- EXTRA analytics endpoints (place after existing /analytics route) ---

function parseCsvRows(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map(x => x.trim());
    if (parts.length !== headers.length) continue;
    const obj = {};
    headers.forEach((h, idx) => {
      const v = parts[idx];
      const n = Number(v);
      obj[h] = Number.isFinite(n) ? n : v;
    });
    rows.push(obj);
  }
  return { headers, rows };
}

app.get('/analytics/equity', async (_req, res) => {
  try {
    let backtest = [];
    let walkforward = [];

    // backtest.csv (ts,equity)
    try {
      const bt = await fs.readFile(path.join(publicDir, 'backtest.csv'), 'utf-8');
      const { rows } = parseCsvRows(bt);
      // normalize types/fields
      backtest = rows
        .filter(r => Number.isFinite(r.ts) && Number.isFinite(r.equity))
        .map(r => ({ ts: Number(r.ts), equity: Number(r.equity) }));
    } catch {}

    // walkforward-agg.csv (idx,equity)
    try {
      const wf = await fs.readFile(path.join(publicDir, 'walkforward-agg.csv'), 'utf-8');
      const { rows } = parseCsvRows(wf);
      walkforward = rows
        .filter(r => Number.isFinite(r.idx) && Number.isFinite(r.equity))
        .map(r => ({ idx: Number(r.idx), equity: Number(r.equity) }));
    } catch {}

    res.json({ backtest, walkforward });
  } catch (e) {
    console.error('[/analytics/equity] error:', e);
    res.json({ backtest: [], walkforward: [] });
  }
});

app.get('/analytics/optimize', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10), 1), 500);
    const sort = String(req.query.sort || 'score');
    const dir  = (String(req.query.dir || 'desc').toLowerCase() === 'asc') ? 'asc' : 'desc';

    const allowed = new Set(['rsiBuy','rsiSell','atrMult','adxMin','trades','closedTrades','winRate','pnl','maxDrawdown','score']);

    let rows = [];
    try {
      const csv = await fs.readFile(path.join(publicDir, 'optimize.csv'), 'utf-8');
      const parsed = parseCsvRows(csv).rows;
      rows = parsed.map(r => {
        const out = {};
        for (const k of Object.keys(r)) {
          const n = Number(r[k]);
          out[k] = Number.isFinite(n) ? n : r[k];
        }
        return out;
      });
    } catch {
      // no file
    }

    if (rows.length && allowed.has(sort)) {
      rows.sort((a, b) => {
        const av = a[sort] ?? 0;
        const bv = b[sort] ?? 0;
        return dir === 'asc' ? (av - bv) : (bv - av);
      });
    }

    res.json(rows.slice(0, limit));
  } catch (e) {
    console.error('[/analytics/optimize] error:', e);
    res.json([]);
  }
});

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
