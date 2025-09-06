import express from 'express';
import { startRunner, stopRunner, getRunnerStatus, getActiveRunnerConfig } from '../liveRunner.js';

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

export function autoRoutes(app) {
  app.use(router);
}

export default { autoRoutes };
