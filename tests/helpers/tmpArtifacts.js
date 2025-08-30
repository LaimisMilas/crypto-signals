import fs from 'fs';
import os from 'os';
import path from 'path';

export async function withTmpArtifacts(fn){
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cs-art-'));
  const prev = process.env.ARTIFACTS_ROOT;
  process.env.ARTIFACTS_ROOT = dir;
  try { return await fn({ dir }); }
  finally { process.env.ARTIFACTS_ROOT = prev; }
}
