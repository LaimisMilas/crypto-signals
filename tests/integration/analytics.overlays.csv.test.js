import { jest } from '@jest/globals';
import request from 'supertest';

await jest.unstable_mockModule('../../src/services/analyticsArtifacts.js', () => ({
  listArtifacts: jest.fn(),
  readArtifactCSV: jest.fn(),
  normalizeEquity: jest.fn(),
  normalizeTrades: jest.fn()
}));
const mockDb = { query: jest.fn() };
await jest.unstable_mockModule('../../src/storage/db.js', () => ({
  db: mockDb,
  getDbPool: () => mockDb,
  isDbReady: () => true,
  listen: async () => () => {}
}));

const svc = await import('../../src/services/analyticsArtifacts.js');
const { db } = await import('../../src/storage/db.js');
const app = (await import('../../src/server.js')).default;

test('GET /analytics/overlays.csv unions time axis', async () => {
  svc.listArtifacts.mockResolvedValue([{ path: 'equity.csv' }]);
  svc.readArtifactCSV.mockResolvedValue([{ ts: 1, equity: 100 }, { ts: 2, equity: 110 }]);
  svc.normalizeEquity.mockImplementation(rows => rows.map(r => ({ ts: r.ts, equity: r.equity })));
  db.query.mockResolvedValue({ rows: [{ type: 'backtest' }] });

  const res = await request(app).get('/analytics/overlays.csv?job_ids=1,2');
  expect(res.status).toBe(200);
  expect(res.headers['content-type']).toMatch(/text\/csv/);
  expect(res.text.split('\n')[0]).toBe('ts,job_1,job_2');
});
