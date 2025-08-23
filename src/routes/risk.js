import express from 'express';
import { loadConfig, saveConfig, getState, setState, logHalt, selectRiskHalts } from '../risk/state.js';

const router = express.Router();

router.get('/risk/status', async (_req, res) => {
  res.json({ state: await getState(), config: await loadConfig() });
});

router.put('/risk/config', async (req, res) => {
  await saveConfig(req.body);
  res.json({ ok: true });
});

router.post('/risk/halt', async (req, res) => {
  const reason = req.body?.reason || 'manual';
  await setState({ state: 'HALTED', reason });
  await logHalt('HALT', reason, req.body || null);
  res.json({ ok: true });
});

router.post('/risk/resume', async (_req, res) => {
  await setState({ state: 'RUNNING', reason: null });
  await logHalt('RESUME', 'manual', null);
  res.json({ ok: true });
});

router.get('/risk/logs', async (_req, res) => {
  const rows = await selectRiskHalts(50);
  res.json(rows);
});

export function riskRoutes(app) {
  app.use(router);
}

export default { riskRoutes };
