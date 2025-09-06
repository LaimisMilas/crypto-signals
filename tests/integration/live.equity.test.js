import { jest } from '@jest/globals';
import request from 'supertest';
import crypto from 'crypto';

const mockDb = { query: jest.fn() };
await jest.unstable_mockModule('../../src/storage/db.js', () => ({
  db: mockDb,
  getDbPool: () => mockDb,
  isDbReady: () => true,
  listen: async () => () => {},
  endPool: async () => {}
}));

const SECRET = 'testsecret';
process.env.AUTH_SECRET = SECRET;
const { db } = await import('../../src/storage/db.js');
const app = (await import('../../src/server.js')).default;

function sign(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}
const token = sign({ sub: 'test', exp: Math.floor(Date.now() / 1000) + 3600 });

describe('/live/equity API', () => {
  beforeEach(()=> { db.query.mockReset(); });

  test('GET /live/equity returns series', async () => {
    db.query.mockResolvedValueOnce({ rows: [
      { ts: 1000, equity: 100 }, { ts: 2000, equity: 110 }, { ts: 3000, equity: 105 }
    ]});
    const res = await request(app).get('/live/equity?from=0&to=9999999').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(3);
  });

  test('POST /live/equity/snapshot upserts', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post('/live/equity/snapshot').set('Authorization', `Bearer ${token}`).send({ ts: 1234, equity: 101.5 });
    expect(res.status).toBe(201);
    expect(db.query).toHaveBeenCalled();
  });
});
