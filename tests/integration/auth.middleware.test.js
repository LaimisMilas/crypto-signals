import { jest } from '@jest/globals';
import request from 'supertest';
import crypto from 'crypto';

const SECRET = 'testsecret';
process.env.AUTH_SECRET = SECRET;

const mockDb = { query: jest.fn().mockResolvedValue({ rows: [{ status: 'active' }] }) };
await jest.unstable_mockModule('../../src/storage/db.js', () => ({
  db: mockDb,
  getDbPool: () => mockDb,
  isDbReady: () => true,
  listen: async () => () => {},
  endPool: async () => {}
}));

await jest.unstable_mockModule('../../src/live.js', () => ({
  getLiveState: jest.fn().mockResolvedValue({ running: false }),
  startLive: jest.fn(),
  stopLive: jest.fn(),
  resetLive: jest.fn(),
  getLiveConfig: jest.fn().mockResolvedValue({}),
  setLiveConfig: jest.fn(),
  stopBackground: jest.fn()
}));

await jest.unstable_mockModule('../../src/risk/state.js', () => ({
  loadConfig: jest.fn().mockResolvedValue({}),
  saveConfig: jest.fn(),
  getState: jest.fn().mockResolvedValue('OK'),
  setState: jest.fn(),
  logHalt: jest.fn(),
  selectRiskHalts: jest.fn().mockResolvedValue([]),
  ensureDayStart: jest.fn(),
  updateRealizedPnlToday: jest.fn()
}));

const app = (await import('../../src/server.js')).default;

function sign(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

const token = sign({ sub: 'tester', exp: Math.floor(Date.now() / 1000) + 3600 });

describe('auth middleware', () => {
  test('denies anonymous /live', async () => {
    const res = await request(app).get('/live');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('unauthorized');
  });

  test('allows authorized /live', async () => {
    const res = await request(app).get('/live').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  test('allows token via query', async () => {
    const res = await request(app).get(`/live?token=${token}`);
    expect(res.status).toBe(200);
  });

  test('denies inactive subscriber', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ status: 'canceled' }] });
    const res = await request(app).get('/live').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('subscription_inactive');
  });

  test('protects /risk routes', async () => {
    let res = await request(app).get('/risk/status');
    expect(res.status).toBe(401);
    res = await request(app).get('/risk/status').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  test('protects /jobs routes', async () => {
    let res = await request(app).get('/jobs');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('unauthorized');
    res = await request(app).get('/jobs').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  test('rejects invalid token', async () => {
    const res = await request(app)
      .get('/live')
      .set('Authorization', 'Bearer invalid');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('unauthorized');
  });

  test('rejects expired token', async () => {
    const expired = sign({ sub: 'tester', exp: Math.floor(Date.now() / 1000) - 10 });
    const res = await request(app).get('/live').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('unauthorized');
  });

  test('requires email or sub', async () => {
    const noEmail = sign({ exp: Math.floor(Date.now() / 1000) + 3600 });
    const res = await request(app).get('/live').set('Authorization', `Bearer ${noEmail}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('subscription_required');
  });

  test('handles db errors', async () => {
    mockDb.query.mockRejectedValueOnce(new Error('db fail'));
    const res = await request(app).get('/live').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('auth_db_error');
  });
});
