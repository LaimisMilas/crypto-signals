import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { withTmpArtifacts } from '../helpers/tmpArtifacts.js';

jest.setTimeout(15000);

const mockDb = { query: jest.fn() };
await jest.unstable_mockModule('../../src/storage/db.js', () => ({
  db: mockDb,
  getDbPool: () => mockDb,
  isDbReady: () => true,
  listen: async () => () => {},
  endPool: async () => {}
}));

const { db } = await import('../../src/storage/db.js');
let app;
let artifactsDir;

await withTmpArtifacts(async ({ dir }) => {
  artifactsDir = dir;
  app = (await import('../../src/server.js')).default;
});

describe('Artifacts routes', () => {
  test('HEAD/GET raw/download with Range', async () => {
    const rel = 'job1/equity.csv';
    const abs = path.resolve(artifactsDir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    const data = Buffer.from('ts,value\n1,100\n2,110\n3,120\n');
    fs.writeFileSync(abs, data);

    db.query.mockImplementation(async (sql, params) => {
      const s = sql.toString();
      if (s.includes('job_artifacts') && s.includes('WHERE job_id=$1 AND id=$2')) {
        return { rows: [{ id: 5, job_id: 1, label: 'equity.csv', path: rel, size_bytes: data.length, remote_url: null }] };
      }
      if (s.includes('job_artifacts') && s.includes('ORDER BY id')) {
        return { rows: [{ id: 5, job_id: 1, label: 'equity.csv', path: rel, size_bytes: data.length, remote_url: null }] };
      }
      return { rows: [] };
    });

    const appReq = request(app);
    const list = await appReq.get('/jobs/1/artifacts');
    expect(list.status).toBe(200);
    expect(list.body.artifacts[0].download).toContain('/jobs/1/artifacts/5/download');

    const head = await appReq.head('/jobs/1/artifacts/5');
    expect(head.status).toBe(200);
    expect(head.headers['etag']).toBeTruthy();

    const raw = await appReq.get('/jobs/1/artifacts/5/raw');
    expect(raw.status).toBe(200);
    expect(raw.text).toContain('ts,value');

    const range = await appReq.get('/jobs/1/artifacts/5/raw').set('Range', 'bytes=0-5');
    expect(range.status).toBe(206);
    expect(range.headers['content-range']).toMatch(/^bytes 0-5\/\d+/);

    const dl = await appReq.get('/jobs/1/artifacts/5/download');
    expect(dl.status).toBe(200);
    expect(dl.headers['content-disposition']).toMatch(/attachment/);
  }, 15000);
});
