import { db } from '../storage/db.js';

export async function log(jobId, level, msg) {
  await db.query(
    'INSERT INTO job_logs(job_id, level, msg) VALUES ($1,$2,$3)',
    [jobId, level, msg]
  );
}

export async function setProgress(jobId, p) {
  await db.query('UPDATE jobs SET progress=$2 WHERE id=$1', [jobId, p]);
}

export async function markStatus(jobId, status, fields = {}) {
  const sets = ['status=$2'];
  const vals = [jobId, status];
  let idx = 3;
  if (fields.result !== undefined) {
    sets.push(`result=$${idx}`);
    vals.push(JSON.stringify(fields.result));
    idx++;
  }
  if (fields.error !== undefined) {
    sets.push(`error=$${idx}`);
    vals.push(fields.error);
    idx++;
  }
  if (status === 'running') sets.push('started_at=now()');
  if (['succeeded', 'failed', 'canceled'].includes(status)) sets.push('finished_at=now()');
  const sql = `UPDATE jobs SET ${sets.join(', ')} WHERE id=$1`;
  await db.query(sql, vals);
}

export async function checkCanceled(jobId) {
  const { rows } = await db.query('SELECT status FROM jobs WHERE id=$1', [jobId]);
  return rows[0] && rows[0].status === 'canceled';
}
