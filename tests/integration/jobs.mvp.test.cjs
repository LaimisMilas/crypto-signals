const request = require('supertest');
const crypto = require('crypto');

let app;
let pgEnv;
let token;

beforeAll(async () => {
    const { startPgWithSchema } = await import('../helpers/pgContainer.js');
    const { withTmpArtifacts } = await import('../helpers/tmpArtifacts.js');
    pgEnv = await startPgWithSchema();
    process.env.DATABASE_URL = pgEnv.DATABASE_URL;
    process.env.AUTH_SECRET = 'testsecret';
    process.env.RUN_JOB_WORKER = '1';
    process.env.NODE_ENV = 'development';
    await withTmpArtifacts(async () => {
      app = (await import('../../src/server.js')).default;
    });
    process.env.NODE_ENV = 'test';
    token = sign({ sub: 'test', exp: Math.floor(Date.now() / 1000) + 3600 });
  }, 60000);

afterAll(async () => {
  await app?.shutdown?.();
  await pgEnv?.container.stop();
}, 10000);

test('backtest job runs and produces artifact', async () => {
  const res = await request(app)
    .post('/jobs')
    .set('Authorization', `Bearer ${token}`)
    .send({ type: 'backtest', params: { symbol: 'BTCUSDT', from_ms: 0, to_ms: 4000, strategy: 'demo' }, priority: 0 });
  expect(res.status).toBe(201);
  const id = res.body.id;
  let job;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500));
    const poll = await request(app).get(`/jobs/${id}`).set('Authorization', `Bearer ${token}`);
    expect(poll.status).toBe(200);
    job = poll.body;
    if (['succeeded', 'failed', 'canceled'].includes(job.status)) break;
  }
  expect(['succeeded', 'failed', 'canceled']).toContain(job.status);
  if (job.status === 'succeeded') {
    const list = await request(app).get(`/jobs/${id}/artifacts`).set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.artifacts.length).toBeGreaterThan(0);
    const art = list.body.artifacts[0];
    const dl = await request(app).get(art.download).set('Authorization', `Bearer ${token}`);
    expect(dl.status).toBe(200);
    expect(dl.text).toMatch(/ts,equity/);
  }
});

function sign(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', 'testsecret').update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}
