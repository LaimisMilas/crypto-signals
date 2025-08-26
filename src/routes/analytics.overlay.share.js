import express from 'express';
import crypto from 'crypto';
import { db } from '../storage/db.js';

const router = express.Router();

router.post('/analytics/overlays/share', async (req, res) => {
  const { jobIds = [], baseline = 'none', align = 'none', rebase = null } = req.body || {};
  if (!Array.isArray(jobIds) || jobIds.length === 0) {
    return res.status(400).json({ error: 'jobIds required' });
  }
  const token = crypto.randomBytes(6).toString('base64url');
  await db.query(`INSERT INTO overlay_shares(token, payload) VALUES($1,$2)`, [
    token,
    { jobIds, baseline, align, rebase, created_at_ms: Date.now() },
  ]);
  res.json({ token, url: `/analytics.html?share=${token}` });
});

router.get('/analytics/overlays/share/:token', async (req, res) => {
  const { rows } = await db.query(`SELECT payload FROM overlay_shares WHERE token=$1`, [req.params.token]);
  if (!rows.length) return res.status(404).json({ error: 'not found' });
  res.json(rows[0].payload);
});

export default router;
