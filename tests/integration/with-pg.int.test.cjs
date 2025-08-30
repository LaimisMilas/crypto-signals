const request = require('supertest');

let app;
let pgEnv;

beforeAll(async () => {
  const { startPgWithSchema } = await import('../helpers/pgContainer.js');
  pgEnv = await startPgWithSchema();
  process.env.DATABASE_URL = pgEnv.DATABASE_URL;
  app = (await import('../../src/server.js')).default;
}, 60000);

afterAll(async () => {
  try {
    if (typeof app.shutdown === 'function') await app.shutdown();
  } catch {}
  try {
    await pgEnv.container.stop();
  } catch {}
}, 60000);

test('GET /live/equity returns series and supports ds', async () => {
  const res = await request(app).get('/live/equity?from=0&to=9999999&ds=lttb&n=2');
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body.items)).toBe(true);
  expect(res.body.items.length).toBeGreaterThan(0);
});

test('GET /portfolio returns holdings/allocation/risk', async () => {
  const res = await request(app).get('/portfolio?from_ms=0&to_ms=9999999');
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('holdings');
  expect(res.body).toHaveProperty('allocation');
  expect(res.body).toHaveProperty('risk');
});

test('GET /analytics with baseline=live returns baseline equity', async () => {
  const res = await request(app).get('/analytics?overlay_job_ids=&baseline=live&ds=lttb&n=100');
  expect(res.status).toBe(200);
  expect(res.body.baseline?.type).toBe('live');
  expect(Array.isArray(res.body.baseline?.equity)).toBe(true);
});
