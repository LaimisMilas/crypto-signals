const request = require('supertest');

let app;
let pgEnv;

beforeAll(async () => {
  const { startPgWithSchema } = await import('../helpers/pgContainer.js');
  const { withTmpArtifacts } = await import('../helpers/tmpArtifacts.js');
  pgEnv = await startPgWithSchema();
  process.env.DATABASE_URL = pgEnv.DATABASE_URL;
  process.env.RUN_JOB_WORKER = '1';
  process.env.NODE_ENV = 'development';
  await withTmpArtifacts(async () => {
    app = (await import('../../src/server.js')).default;
  });
  process.env.NODE_ENV = 'test';
}, 60000);

afterAll(async () => {
  try {
    if (app && typeof app.shutdown === 'function') await app.shutdown();
  } catch {}
  try {
    if (pgEnv) await pgEnv.container.stop();
  } catch {}
}, 60000);

test('backtest job runs and produces artifact', async () => {
  const res = await request(app).post('/jobs/backtest').send({ symbol: 'BTCUSDT', from_ms: 0, to_ms: 4000, strategy: 'demo' });
  expect(res.status).toBe(201);
  const id = res.body.id;
  let job;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500));
    const poll = await request(app).get(`/jobs/${id}`);
    expect(poll.status).toBe(200);
    job = poll.body;
    if (['succeeded', 'failed', 'canceled'].includes(job.status)) break;
  }
  expect(['succeeded', 'failed', 'canceled']).toContain(job.status);
  if (job.status === 'succeeded') {
    const list = await request(app).get(`/jobs/${id}/artifacts`);
    expect(list.status).toBe(200);
    expect(list.body.artifacts.length).toBeGreaterThan(0);
    const art = list.body.artifacts[0];
    const dl = await request(app).get(art.download);
    expect(dl.status).toBe(200);
    expect(dl.text).toMatch(/ts,equity/);
  }
});
