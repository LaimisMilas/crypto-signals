import fs from 'fs/promises';
import path from 'path';
import { db } from '../storage/db.js';
import { jobArtifactsSize } from '../metrics-job.js';

const ROOT = process.env.JOBS_DIR || '/mnt/data/jobs';

export async function ensureJobDir(jobId) {
  const dir = path.join(ROOT, String(jobId));
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

async function recordArtifact(jobId, jobType, kind, label, p) {
  const stat = await fs.stat(p).catch(() => ({ size: 0 }));
  jobArtifactsSize.labels(jobType).set(stat.size);
  await db.query(
    'INSERT INTO job_artifacts(job_id, kind, label, path, size_bytes) VALUES ($1,$2,$3,$4,$5)',
    [jobId, kind, label, p, stat.size]
  );
  return { path: p, size: stat.size };
}

export async function writeJSON(jobId, jobType, filename, data, label = null) {
  const dir = await ensureJobDir(jobId);
  const p = path.join(dir, filename);
  await fs.writeFile(p, JSON.stringify(data, null, 2));
  return recordArtifact(jobId, jobType, 'json', label, p);
}

export async function writeCSV(jobId, jobType, filename, csv, label = null) {
  const dir = await ensureJobDir(jobId);
  const p = path.join(dir, filename);
  await fs.writeFile(p, csv);
  return recordArtifact(jobId, jobType, 'csv', label, p);
}
