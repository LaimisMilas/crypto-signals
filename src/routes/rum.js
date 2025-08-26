import { Router } from 'express';
import { rumFcp, rumLcp, rumTTFB, rumLongtasks, rumLongtaskMax, rumSseReconnects, rumSseConnected } from '../metrics-rum.js';

export const rumRouter = Router();

rumRouter.post('/metrics', (req, res) => {
  const b = req.body || {};
  switch (b.type) {
    case 'navigation':
      if (b.ttfb != null) rumTTFB.observe(b.ttfb);
      break;
    case 'paint':
      if (b.fcp != null) rumFcp.observe(b.fcp);
      if (b.lcp != null) rumLcp.observe(b.lcp);
      break;
    case 'longtask':
      if (b.longtasks) rumLongtasks.inc(b.longtasks);
      if (b.longtaskMaxMs != null) rumLongtaskMax.set(b.longtaskMaxMs);
      break;
  }
  res.json({ ok: true });
});

rumRouter.post('/sse', (req, res) => {
  const { connectedSeconds = 0, reconnectAttempts = 0, clientType = 'web' } = req.body || {};
  if (reconnectAttempts) rumSseReconnects.inc({ clientType }, reconnectAttempts);
  if (connectedSeconds) rumSseConnected.inc({ clientType }, connectedSeconds);
  res.json({ ok: true });
});
