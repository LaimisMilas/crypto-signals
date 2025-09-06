import express from 'express';
import { startRunner, stopRunner, getRunnerStatus, getActiveRunnerConfig } from '../liveRunner.js';
import { buildOrders, sendOrders } from '../risk/orders.js';

const router = express.Router();

router.post('/auto/start', (req, res) => {
  const cfg = req.body || {};
  startRunner(cfg);
  res.json({ ok: true, status: getRunnerStatus() });
});

router.post('/auto/stop', (_req, res) => {
  stopRunner();
  res.json({ ok: true, status: getRunnerStatus() });
});

router.get('/auto/status', (_req, res) => {
  res.json({ status: getRunnerStatus(), config: getActiveRunnerConfig() });
});

router.post('/auto/order', async (req, res) => {
  try {
    const params = req.body || {};
    const orders = buildOrders(params);
    const result = await sendOrders(orders);
    res.json({ ok: true, result });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

export function autoRoutes(app) {
  app.use(router);
}

export default { autoRoutes };
