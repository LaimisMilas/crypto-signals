import express from 'express';
import fs from 'fs';
import path from 'path';
import { db } from '../storage/db.js';
import { mimeOf, safeResolve, etagFromStat, statCached, parseRange } from '../services/artifactsFS.js';
import logger from '../observability/logger.js';

const router = express.Router();

async function getArtifact(jobId, artifactId) {
  const { rows } = await db.query(
    `SELECT id, job_id, kind, label, path, size_bytes, remote_url
     FROM job_artifacts WHERE job_id=$1 AND id=$2`,
    [jobId, artifactId]
  );
  return rows[0] || null;
}

router.get('/jobs/:jobId/artifacts', async (req, res) => {
  const jobId = Number(req.params.jobId);
  const { rows } = await db.query(
    `SELECT id, job_id, kind, label, path, size_bytes, remote_url
     FROM job_artifacts WHERE job_id=$1 ORDER BY id`,
    [jobId]
  );
  res.json({
    artifacts: rows.map(a => ({
      ...a,
      raw: `/jobs/${jobId}/artifacts/${a.id}/raw`,
      download: `/jobs/${jobId}/artifacts/${a.id}/download`
    }))
  });
});

router.head('/jobs/:jobId/artifacts/:artifactId', async (req, res) => {
  const jobId = Number(req.params.jobId);
  const artifactId = Number(req.params.artifactId);
  const a = await getArtifact(jobId, artifactId);
  if (!a) return res.status(404).end();
  if (a.remote_url) return res.status(200).setHeader('Location', a.remote_url).end();

  try {
    const abs = safeResolve(a.path);
    const meta = statCached(abs);
    const etag = etagFromStat(abs, { size: meta.size, mtimeMs: meta.mtimeMs });
    res.setHeader('Content-Length', String(meta.size));
    res.setHeader('ETag', etag);
    res.setHeader('Last-Modified', new Date(meta.mtimeMs).toUTCString());
    res.setHeader('Content-Type', mimeOf(abs));
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).end();
  } catch {
    res.status(404).end();
  }
});

async function streamArtifact(req, res, { disposition }) {
  const jobId = Number(req.params.jobId);
  const artifactId = Number(req.params.artifactId);
  const a = await getArtifact(jobId, artifactId);
  if (!a) return res.status(404).json({ error: 'artifact not found' });

  if (a.remote_url) {
    return res.redirect(302, a.remote_url);
  }

  try {
    const abs = safeResolve(a.path);
    const meta = statCached(abs);
    const etag = etagFromStat(abs, { size: meta.size, mtimeMs: meta.mtimeMs });

    if (req.headers['if-none-match'] === etag) {
      res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.status(304).end();
    }

    const mime = mimeOf(abs);
    const range = parseRange(req.headers.range, meta.size);

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('ETag', etag);
    res.setHeader('Last-Modified', new Date(meta.mtimeMs).toUTCString());
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Content-Type', mime);
    if (disposition === 'attachment') {
      const fname = (a.label || path.basename(abs)).replace(/"/g, '');
      res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
    } else {
      res.setHeader('Content-Disposition', 'inline');
    }

    if (range) {
      const { start, end, length } = range;
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${meta.size}`);
      res.setHeader('Content-Length', String(length));
      logger.info({ jobId, artifactId, range: `${start}-${end}` }, 'artifact_range');
      fs.createReadStream(abs, { start, end, highWaterMark: 256 * 1024 }).pipe(res);
    } else {
      res.status(200);
      res.setHeader('Content-Length', String(meta.size));
      logger.info({ jobId, artifactId }, 'artifact_full');
      fs.createReadStream(abs, { highWaterMark: 256 * 1024 }).pipe(res);
    }
  } catch (e) {
    logger.error({ err: e, jobId, artifactId }, 'artifact_stream_error');
    res.status(404).json({ error: 'artifact not found' });
  }
}

router.get('/jobs/:jobId/artifacts/:artifactId/raw', async (req, res) => {
  streamArtifact(req, res, { disposition: 'inline' });
});

router.get('/jobs/:jobId/artifacts/:artifactId/download', async (req, res) => {
  streamArtifact(req, res, { disposition: 'attachment' });
});

export default router;

