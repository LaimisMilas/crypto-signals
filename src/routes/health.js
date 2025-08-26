export function healthRoutes(app) {
  app.get('/healthz', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/readyz', (_req, res) => {
    res.json({ ready: true });
  });
}
