const request = require('supertest');
const crypto = require('crypto');

let app;
let pgEnv;
let token;

beforeAll(async () => {
  const { startPgWithSchema } = await import('../helpers/pgContainer.js');
  pgEnv = await startPgWithSchema();
  process.env.DATABASE_URL = pgEnv.DATABASE_URL;
  process.env.AUTH_SECRET = 'testsecret';
  process.env.RUN_JOB_WORKER = '0';
  process.env.NODE_ENV = 'development';
  app = (await import('../../src/server.js')).default;
  process.env.NODE_ENV = 'test';
  token = sign({ sub: 'test', exp: Math.floor(Date.now() / 1000) + 3600 });
}, 60000);

afterAll(async () => {
  await app?.shutdown?.();
  await pgEnv?.container.stop();
}, 10000);

test('creates job via POST /jobs', async () => {
  const res = await request(app)
    .post('/jobs')
    .set('Authorization', `Bearer ${token}`)
    .send({ type: 'backtest', params: { foo: 'bar' }, priority: 5 });
  expect(res.status).toBe(201);
  const jobId = res.body.id;
  const list = await request(app)
    .get('/jobs')
    .set('Authorization', `Bearer ${token}`);
  expect(list.status).toBe(200);
  expect(list.body.some(j => j.id === jobId)).toBe(true);
});

function sign(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', 'testsecret').update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}
