import express from 'express';
import crypto from 'crypto';
import { db } from '../storage/db.js';

const router = express.Router();

function sanitizePayload(p = {}) {
  const version = 1;
  const jobIds = Array.isArray(p.jobIds) ? p.jobIds.filter(n => Number.isFinite(Number(n))).slice(0, 12) : [];
  const baseline = (p.baseline === 'live') ? 'live' : 'none';
  const align = (p.align === 'first-common') ? 'first-common' : 'none';
  const rebase = (p.rebase == null || p.rebase === '') ? null : Number(p.rebase);
  const inline = p.inline && p.inline.optimizeJobId ? {
    optimizeJobId: Number(p.inline.optimizeJobId),
    n: Math.max(1, Math.min(10, Number(p.inline.n) || 3)),
    tol: Math.max(0, Number(p.inline.tol) || 0)
  } : null;
  return { version, jobIds, baseline, align, rebase, ...(inline ? { inline } : {}) };
}

router.get('/analytics/overlay-sets', async (_req, res) => {
  const { rows } = await db.query(`SELECT id, name, description, payload, pinned, token, created_at, updated_at
                                   FROM overlay_sets ORDER BY pinned DESC, updated_at DESC LIMIT 100`);
  res.json({ sets: rows });
});

router.get('/analytics/overlay-sets/:id', async (req, res) => {
  const { rows } = await db.query(`SELECT id, name, description, payload, pinned, token, created_at, updated_at
                                   FROM overlay_sets WHERE id=$1`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'not found' });
  res.json(rows[0]);
});

router.post('/analytics/overlay-sets', async (req, res) => {
  const { name, description, payload } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  const pl = sanitizePayload(payload);
  const { rows } = await db.query(
    `INSERT INTO overlay_sets(name, description, payload) VALUES($1,$2,$3) RETURNING *`,
    [name, description || null, pl]
  );
  res.status(201).json(rows[0]);
});

router.put('/analytics/overlay-sets/:id', async (req, res) => {
  const fields = [];
  const args = [];
  let i = 1;
  if (req.body?.name != null) { fields.push(`name=$${i++}`); args.push(req.body.name); }
  if (req.body?.description !== undefined) { fields.push(`description=$${i++}`); args.push(req.body.description); }
  if (req.body?.payload) { fields.push(`payload=$${i++}`); args.push(sanitizePayload(req.body.payload)); }
  if (req.body?.pinned != null) { fields.push(`pinned=$${i++}`); args.push(!!req.body.pinned); }
  if (!fields.length) return res.status(400).json({ error: 'nothing to update' });
  args.push(req.params.id);
  const { rows } = await db.query(`UPDATE overlay_sets SET ${fields.join(', ')} WHERE id=$${i} RETURNING *`, args);
  if (!rows.length) return res.status(404).json({ error: 'not found' });
  res.json(rows[0]);
});

router.delete('/analytics/overlay-sets/:id', async (req, res) => {
  const { rowCount } = await db.query(`DELETE FROM overlay_sets WHERE id=$1`, [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'not found' });
  res.json({ ok: true });
});

router.post('/analytics/overlay-sets/:id/share', async (req, res) => {
  const { rows } = await db.query(`SELECT id, payload, token FROM overlay_sets WHERE id=$1`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'not found' });
  let token = rows[0].token;
  if (!token) {
    token = crypto.randomBytes(6).toString('base64url');
    await db.query(`UPDATE overlay_sets SET token=$1 WHERE id=$2`, [token, req.params.id]);
  }
  res.json({ token, url: `/analytics.html?share=${token}` });
});

router.get('/analytics/overlay-sets/share/:token', async (req, res) => {
  const { rows } = await db.query(`SELECT payload FROM overlay_sets WHERE token=$1`, [req.params.token]);
  if (!rows.length) return res.status(404).json({ error: 'not found' });
  res.json(rows[0].payload);
});

export default router;
