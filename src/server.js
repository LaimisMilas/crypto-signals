import { startOtel } from './otel.js';
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
import { equityRoutes } from './routes/equity.js';
import { userStreamRoutes } from './routes/live.js';
import { portfolioRoutes } from './routes/portfolio.js';
import { riskRoutes } from './routes/risk.js';
import { getStrategies } from './strategies/index.js';
import { configRoutes } from './routes/config.js';
import { jobsRoutes } from './routes/jobs.js';
import binanceRoutes from './integrations/binance/routes.js';
import { healthRoutes } from './routes/health.js';
import analyticsJobsRoutes from './routes/analytics.jobs.js';
import './observability/otel.js';
import httpLogger from './observability/http-logger.js';
import logger from './observability/logger.js';
import { requestId } from './middleware/request-id.js';
import { loggerContext } from './middleware/logger-context.js';
import { errorHandler } from './middleware/error-handler.js';
import { metricsRouter, httpRequests, httpDuration } from './observability/metrics.js';
import { sseRoutes } from './routes/sse.js';
import analyticsOverlaysCsvRoutes from './routes/analytics.overlays.csv.js';
import analyticsOverlayShareRoutes from './routes/analytics.overlay.share.js';
import analyticsOptimizeTopRoutes from './routes/analytics.optimize.top.js';
import analyticsOptimizeInlineRoutes from './routes/analytics.optimize.inline.js';
import analyticsOverlayRoutes from './routes/analytics-overlay.js';
import analyticsOverlaySetsRoutes from './routes/analytics.overlay.sets.js';
import analyticsReportRoutes from './routes/analytics.report.js';
import { listArtifacts, readArtifactCSV, normalizeEquity } from './services/analyticsArtifacts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'client', 'public');
const app = express();
// Alias db pool for clarity
const pool = db;

app.use(requestId);
app.use(httpLogger);
app.use(loggerContext);
app.use((req, res, next) => {
  const end = httpDuration.startTimer({ method: req.method, route: req.path });
  res.on('finish', () => {
    httpRequests.inc({ method: req.method, route: req.path, status: res.statusCode });
    end({ status: res.statusCode });
  });
  next();
});
app.use(cors());
app.use(cookieParser());

// Stripe webhook must use raw body
app.post('/webhook/stripe', bodyParser.raw({ type: 'application/json' }), stripeWebhook);

// JSON body for general APIs
app.use(bodyParser.json());

// Equity routes (SSE and fetch)
equityRoutes(app);
userStreamRoutes(app);
portfolioRoutes(app);
riskRoutes(app);
configRoutes(app);
jobsRoutes(app);
app.use('/binance', binanceRoutes);
healthRoutes(app);
app.use('/', analyticsJobsRoutes);
  app.use('/', analyticsOverlaysCsvRoutes);
  app.use('/', analyticsOverlayShareRoutes);
  app.use('/', analyticsOptimizeTopRoutes);
  app.use('/', analyticsOptimizeInlineRoutes);
  app.use('/', analyticsOverlayRoutes);
  app.use('/', analyticsOverlaySetsRoutes);
  app.use('/', analyticsReportRoutes);
  sseRoutes(app);
  metricsRouter(app);

app.get('/strategies', (_req, res) => {
  res.json(getStrategies().map(s => ({ id: s.id, label: s.id.toUpperCase() })));
});

function bool(v) { return !!(v && String(v).length); }

function computeStatsFromTrades(trades, fromMs = null, toMs = null) {
  const equity = [];
  const returns = [];
  let eq = 10000;
  let peak = eq;
  let maxDD = 0;
  for (const t of trades) {
    const prevEq = eq;
    eq += t.pnl || 0;
    const ts = t.closed_at || t.ts_close || t.ts || null;
    if (ts !== null) equity.push({ ts, equity: Number(eq.toFixed(2)) });
    if (eq > peak) peak = eq;
    const dd = (eq - peak) / peak;
    if (dd < maxDD) maxDD = dd;
    if (prevEq > 0) returns.push((eq - prevEq) / prevEq);
  }

  const avg = arr => arr.reduce((a, b) => a + b, 0) / (arr.length || 1);
  const std = arr => {
    if (arr.length <= 1) return 0;
    const m = avg(arr);
    return Math.sqrt(arr.reduce((a, b) => a + Math.pow(b - m, 2), 0) / (arr.length - 1));
  };

  const total = trades.length;
  const wins = trades.filter(t => (t.pnl || 0) > 0);
  const profit = wins.reduce((a, b) => a + (b.pnl || 0), 0);
  const losses = trades.filter(t => (t.pnl || 0) < 0);
  const loss = losses.reduce((a, b) => a + (b.pnl || 0), 0);
  const avgPnL = total ? (profit + loss) / total : 0;
  const avgPnLPct = total ? trades.reduce((a, b) => a + (b.pnl_pct || 0), 0) / total : 0;
  const profitFactor = loss !== 0 ? profit / Math.abs(loss) : null;
  const winRate = total ? wins.length / total : 0;
  const sharpe = returns.length > 1 ? (avg(returns) / std(returns)) * Math.sqrt(252) : null;
  const downside = returns.filter(r => r < 0);
  const sortino = downside.length > 1 ? (avg(returns) / std(downside)) * Math.sqrt(252) : null;
  const cagr = equity.length > 1 && fromMs && toMs && toMs > fromMs
    ? Math.pow(equity[equity.length - 1].equity / 10000, 31557600000 / (toMs - fromMs)) - 1
    : null;

  return {
    equity,
    stats: {
      totalTrades: total,
      winRate,
      avgPnL,
      avgPnLPct,
      profitFactor,
      maxDrawdown: maxDD,
      sharpe,
      sortino,
      cagr,
    }
  };
}

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


app.get('/live/history', async (req, res) => {
  const parseDateMs = (v) => {
    if (!v) return null;
    const t = Date.parse(String(v));
    return Number.isNaN(t) ? null : t;
  };

  const parseParams = (raw) => {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      const obj = {};
      for (const part of String(raw).split(/[;,]/)) {
        const [k, v] = part.split('=').map(s => s.trim());
        if (k && v) obj[k] = isNaN(v) ? v : Number(v);
      }
      return Object.keys(obj).length ? obj : null;
    }
  };

  const symbol = (req.query.symbol || '').toString().trim() || null;
  const strategy = (req.query.strategy || '').toString().trim() || null;
  const fromMs = parseDateMs(req.query.from);
  const toMs = parseDateMs(req.query.to);
  const paramsObj = parseParams(req.query.params);

  res.set('Cache-Control', 'no-store');

  try {
    const q = `
      SELECT id, opened_at, closed_at, symbol, strategy, side, qty,
             entry_price, exit_price, pnl, pnl_pct, params
      FROM paper_trades
      WHERE status = 'CLOSED'
        AND ($1::text  IS NULL OR symbol   = $1::text)
        AND ($2::text  IS NULL OR strategy = $2::text)
        AND ($3::bigint IS NULL OR closed_at >= $3::bigint)
        AND ($4::bigint IS NULL OR closed_at <= $4::bigint)
        AND ($5::jsonb IS NULL OR params @> $5::jsonb)
      ORDER BY closed_at DESC
      LIMIT 500
    `;
    const { rows } = await db.query(q, [
      symbol,
      strategy,
      fromMs,
      toMs,
      paramsObj ? JSON.stringify(paramsObj) : null,
    ]);

    const closedTrades = rows.map(r => ({
      id: r.id,
      opened_at: r.opened_at ? Number(r.opened_at) : null,
      closed_at: r.closed_at ? Number(r.closed_at) : null,
      symbol: r.symbol,
      strategy: r.strategy,
      side: r.side,
      qty: r.qty ? Number(r.qty) : null,
      entry_price: r.entry_price ? Number(r.entry_price) : null,
      exit_price: r.exit_price ? Number(r.exit_price) : null,
      pnl: r.pnl ? Number(r.pnl) : 0,
      pnl_pct: r.pnl_pct ? Number(r.pnl_pct) : 0,
      params: r.params || null,
    }));

    return res.json({
      filters: {
        symbol,
        strategy,
        from: fromMs ? new Date(fromMs).toISOString() : null,
        to: toMs ? new Date(toMs).toISOString() : null,
        params: paramsObj,
      },
      closedTrades,
    });
  } catch (e) {
    console.error('[/live/history] db error:', e);
    res.status(500).json({ error: 'db_error' });
  }
});

// --- Analytics dashboard ---

// Serve static analytics dashboard
app.get('/analytics.html', (_req, res) => {
  res.sendFile(path.join(publicDir, 'analytics.html'));
});

// Portfolio dashboard
app.get('/portfolio.html', (_req, res) => {
  res.sendFile(path.join(publicDir, 'portfolio.html'));
});

// Analytics API
app.get('/analytics', async (req, res) => {
  const parseDateMs = (v) => {
    if (!v) return null;
    const t = Date.parse(String(v));
    return Number.isNaN(t) ? null : t;
  };

  const parseParams = (raw) => {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      const obj = {};
      for (const part of String(raw).split(/[;,]/)) {
        const [k, v] = part.split('=').map(s => s.trim());
        if (k && v) obj[k] = isNaN(v) ? v : Number(v);
      }
      return Object.keys(obj).length ? obj : null;
    }
  };

  const symbol = (req.query.symbol || '').toString().trim() || null;
  const strategy = (req.query.strategy || '').toString().trim() || null;
  const interval = (req.query.interval || '').toString().trim() || null;
  const fromMs = parseDateMs(req.query.from);
  const toMs = parseDateMs(req.query.to);
  const paramsObj = parseParams(req.query.params);

  res.set('Cache-Control', 'no-store');

  let rows = [];
  try {
    const q = `
      SELECT id, opened_at, closed_at, symbol, strategy, side, qty, entry_price, exit_price, pnl, pnl_pct, params
      FROM paper_trades
      WHERE status = 'CLOSED'
        AND ($1::bigint IS NULL OR closed_at >= $1::bigint)
        AND ($2::bigint IS NULL OR closed_at <  $2::bigint)
        AND ($3::text  IS NULL OR symbol   = $3::text)
        AND ($4::text  IS NULL OR strategy = $4::text)
        AND ($5::jsonb IS NULL OR params @> $5::jsonb)
      ORDER BY closed_at ASC
      LIMIT 50000
    `;
    const { rows: dbRows } = await db.query(q, [fromMs, toMs, symbol, strategy, paramsObj ? JSON.stringify(paramsObj) : null]);
    rows = dbRows;
  } catch (e) {
    console.error('[/analytics] db error:', e);
    return res.status(500).json({ error: 'db_error' });
  }

  const closedTrades = rows.map(r => ({
    id: r.id,
    opened_at: r.opened_at ? Number(r.opened_at) : null,
    closed_at: r.closed_at ? Number(r.closed_at) : null,
    symbol: r.symbol,
    strategy: r.strategy,
    side: r.side,
    qty: r.qty ? Number(r.qty) : null,
    entry_price: r.entry_price ? Number(r.entry_price) : null,
    exit_price: r.exit_price ? Number(r.exit_price) : null,
    pnl: r.pnl ? Number(r.pnl) : 0,
    pnl_pct: r.pnl_pct ? Number(r.pnl_pct) : 0,
    params: r.params || null,
  }));

  const { equity, stats } = computeStatsFromTrades(closedTrades, fromMs, toMs);

  const q = new URLSearchParams();
  if (symbol) q.set('symbol', symbol);
  if (strategy) q.set('strategy', strategy);
  if (fromMs) q.set('from', new Date(fromMs).toISOString());
  if (toMs) q.set('to', new Date(toMs).toISOString());
  if (paramsObj) q.set('params', JSON.stringify(paramsObj));
  const qs = q.toString();

  let overlayEquities = null;
  let overlayStatsByJobId = null;
  const overlayJobIds = (req.query.overlay_job_ids || '')
    .split(',')
    .map(s => Number(s.trim()))
    .filter(Boolean)
    .slice(0, 5);
  const baselineOpt = req.query.baseline === 'live' ? 'live' : 'none';
  const overlayAlign = req.query.overlay_align === 'first-common' ? 'first-common' : 'none';
  const overlayRebase = req.query.overlay_rebase ? Number(req.query.overlay_rebase) : null;
  let baselineObj = null;
  let baselineStats = null;
  if (overlayJobIds.length) {
    overlayEquities = [];
    overlayStatsByJobId = {};
    for (const id of overlayJobIds) {
      try {
        const arts = await listArtifacts(id);
        const a = arts.find(x => /equity\.csv$|oos_equity\.csv$/i.test(x.path));
        if (!a) continue;
        const rows = await readArtifactCSV(id, a.path);
        const { rows: jrows } = await db.query('SELECT type FROM jobs WHERE id=$1', [id]);
        const eq = normalizeEquity(rows, jrows[0]?.type);
        if (!eq.length) continue;

        const ret = eq.at(-1).equity / eq[0].equity - 1;
        let peak = -Infinity;
        let maxDD = 0;
        eq.forEach(p => {
          peak = Math.max(peak, p.equity);
          maxDD = Math.min(maxDD, (p.equity / peak - 1));
        });

        overlayEquities.push({ jobId: id, label: `#${id}`, equity: eq });
        overlayStatsByJobId[id] = { return: ret, maxDD };
      } catch (e) {
        console.error('[analytics] overlay equity error:', e);
      }
    }
  }

  if (baselineOpt === 'live') {
    baselineObj = { type: 'live', equity };
    if (equity.length) {
      const bret = equity.at(-1).equity / equity[0].equity - 1;
      let bpk = -Infinity;
      let bdd = 0;
      equity.forEach(p => {
        bpk = Math.max(bpk, p.equity);
        bdd = Math.min(bdd, (p.equity / bpk - 1));
      });
      baselineStats = { return: bret, maxDD: bdd };
    }
  }

  let alignHint = null;
  if (overlayAlign === 'first-common') {
    const series = [];
    if (baselineObj) series.push(baselineObj.equity);
    if (overlayEquities) overlayEquities.forEach(s => series.push(s.equity));
    if (series.length > 1) {
      const sets = series.map(s => new Set(s.map(p => p.ts)));
      const candidates = [...sets[0]].sort((a, b) => a - b);
      for (const t of candidates) {
        if (sets.every(S => S.has(t))) { alignHint = t; break; }
      }
    }
  }

  if (baselineStats && overlayEquities && overlayEquities.length) {
    for (const { jobId } of overlayEquities) {
      const s = overlayStatsByJobId[jobId];
      if (s) {
        s.deltaReturn = s.return - baselineStats.return;
        s.deltaMaxDD = s.maxDD - baselineStats.maxDD;
      }
    }
  }

  const overlayEquity = overlayEquities?.[0]?.equity || null;
  const overlayStats = overlayJobIds.length === 1 ? (overlayStatsByJobId?.[overlayJobIds[0]] || null) : null;

  return res.json({
    filters: {
      symbol,
      strategy,
      from: fromMs ? new Date(fromMs).toISOString() : null,
      to: toMs ? new Date(toMs).toISOString() : null,
      params: paramsObj,
      interval,
    },
    equity,
    closedTrades,
    stats,
    overlayEquity,
    overlayStats,
    overlayEquities,
    overlayStatsByJobId,
    baseline: baselineObj,
    alignHint,
    csv: {
      backtest: `/analytics/backtest.csv${qs ? `?${qs}` : ''}`,
      optimize: `/analytics/optimize.csv${qs ? `?${qs}` : ''}`,
      walkforward: `/analytics/walkforward.csv${qs ? `?${qs}` : ''}`,
    },
  });
});

app.get('/analytics/trades.csv', async (req, res) => {
  try {
    const parseDateMs = (v) => {
      if (!v) return null;
      const t = Date.parse(String(v));
      return Number.isNaN(t) ? null : t;
    };

    const parseParams = (raw) => {
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        const obj = {};
        for (const part of String(raw).split(/[;,]/)) {
          const [k, v] = part.split('=').map(s => s.trim());
          if (k && v) obj[k] = isNaN(v) ? v : Number(v);
        }
        return Object.keys(obj).length ? obj : null;
      }
    };

    const fromMs = parseDateMs(req.query.from);
    const toMs = parseDateMs(req.query.to);
    const symbol = (req.query.symbol || '').toString().trim() || null;
    const strategy = (req.query.strategy || '').toString().trim() || null;
    const paramsObj = parseParams(req.query.params);

    const client = await pool.connect();
    try {
      const q = `
        SELECT id, opened_at, closed_at, symbol, strategy, side, qty, entry_price, exit_price, pnl, pnl_pct
        FROM paper_trades
        WHERE status = 'CLOSED'
          AND ($1::bigint IS NULL OR closed_at >= $1::bigint)
          AND ($2::bigint IS NULL OR closed_at <  $2::bigint)
          AND ($3::text  IS NULL OR symbol   = $3::text)
          AND ($4::text  IS NULL OR strategy = $4::text)
          AND ($5::jsonb IS NULL OR params @> $5::jsonb)
        ORDER BY closed_at ASC
        LIMIT 50000
      `;
      const { rows } = await client.query(q, [fromMs, toMs, symbol, strategy, paramsObj ? JSON.stringify(paramsObj) : null]);

      const header = 'id,opened_at,closed_at,symbol,strategy,side,qty,entry_price,exit_price,pnl,pnl_pct';
      const lines = rows.map(r => [
        r.id,
        r.opened_at || '',
        r.closed_at || '',
        r.symbol || '',
        r.strategy || '',
        r.side || '',
        r.qty || '',
        r.entry_price || '',
        r.exit_price || '',
        r.pnl || '',
        r.pnl_pct || '',
      ].join(','));

      const csv = [header, ...lines].join('\n');
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


// Static files
app.use(express.static(publicDir));

app.use(errorHandler);

// 404 fallback for any unmatched request
app.use((req, res) => {
  res.status(404).sendFile(path.join(publicDir, '404.html'));
});

const PORT = process.env.PORT || 3000;

async function start() {
  await startOtel();
  app.listen(PORT, () => {
    logger.info(`Server running on :${PORT}`);
  });

  if (process.env.ENABLE_JOB_WORKER === 'true') {
    import('./jobs/worker.js').then(m => m.startWorker());
  }
}

start();
