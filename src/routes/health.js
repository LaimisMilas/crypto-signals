import { Router } from 'express';
import pkg from '../../package.json' assert { type: 'json' };
import { db } from '../storage/db.js';

const router = Router();

router.get('/healthz', (_req, res) => {
  res.json({ ok: true, service: 'crypto-signals' });
});

router.get('/version', (_req, res) => {
  res.json({ version: pkg.version, commit: process.env.GIT_COMMIT || null });
});

router.get('/readyz', async (_req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ ready: true });
  } catch (e) {
    res.status(500).json({ ready: false, error: e.message });
  }
});

export default router;
