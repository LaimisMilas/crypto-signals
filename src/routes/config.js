import express from 'express';
import { getActiveConfig, validateConfig, saveActiveConfig, applyActiveConfig, schemas } from '../config/strategies.js';
import { getStrategies } from '../strategies/index.js';
import { getRunnerStatus } from '../liveRunner.js';
import { db } from '../storage/db.js';

const router = express.Router();

router.get('/config/strategies', async (_req, res) => {
  const active = await getActiveConfig();
  const available = getStrategies().map(s => ({ id: s.id, defaultParams: s.defaultParams }));
  const presets = await db.query('SELECT id,name,strategy_id,params,symbols,created_at FROM strategy_presets ORDER BY created_at DESC LIMIT 200');
  res.json({ active, available, schemas, presets: presets.rows, runner: getRunnerStatus() });
});

router.put('/config/strategies', async (req, res) => {
  const cfg = req.body;
  const { ok, errors } = validateConfig(cfg);
  if (!ok) return res.status(400).json({ ok: false, errors });
  await saveActiveConfig(cfg);
  res.json({ ok: true });
});

router.post('/config/strategies/apply', async (req, res) => {
  const cfg = req.body;
  const { ok, errors } = validateConfig(cfg);
  if (!ok) return res.status(400).json({ ok: false, errors });
  await saveActiveConfig(cfg);
  await applyActiveConfig();
  res.json({ ok: true, runner: getRunnerStatus() });
});

router.post('/config/presets', async (req, res) => {
  const { name, strategy_id, params, symbols = [] } = req.body || {};
  const { ok, errors } = validateConfig({ strategies: [{ id: strategy_id, params, symbols: symbols.length ? symbols : ['BTCUSDT'] }] });
  if (!ok) return res.status(400).json({ ok: false, errors });
  const { rows } = await db.query(
    'INSERT INTO strategy_presets(name,strategy_id,params,symbols) VALUES($1,$2,$3,$4) RETURNING *',
    [name, strategy_id, params, symbols]
  );
  res.json(rows[0]);
});

router.get('/config/presets', async (_req, res) => {
  const { rows } = await db.query('SELECT * FROM strategy_presets ORDER BY created_at DESC LIMIT 200');
  res.json(rows);
});

router.delete('/config/presets/:id', async (req, res) => {
  await db.query('DELETE FROM strategy_presets WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

router.get('/runner/status', (_req, res) => {
  res.json(getRunnerStatus());
});

export function configRoutes(app) {
  app.use(router);
}

export default { configRoutes };
