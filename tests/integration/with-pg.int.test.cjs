const request = require('supertest');

let app;
let pgEnv;

beforeAll(async () => {
  const { startPgWithSchema } = await import('../helpers/pgContainer.js');
  pgEnv = await startPgWithSchema();
  process.env.DATABASE_URL = pgEnv.DATABASE_URL;
  process.env.NODE_ENV = 'test';
  app = (await import('../../src/server.js')).default;
}, 60000);

afterAll(async () => {
  await pgEnv.container.stop();
}, 60000);

test('GET /live/equity returns series and supports ds', async () => {
  const res = await request(app).get('/live/equity?from=0&to=9999999&ds=lttb&n=2');
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body.items)).toBe(true);
  expect(res.body.items.length).toBeGreaterThan(0);
});

test('GET /portfolio returns holdings/allocation/risk', async () => {
  const res = await request(app).get('/portfolio');
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
