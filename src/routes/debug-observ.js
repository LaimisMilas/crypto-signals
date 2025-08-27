import { Router } from 'express';
import { generateSignals } from '../signal/generateSignals.js';

export const debugObservRouter = Router();

debugObservRouter.post('/debug/run-indicators', async (req, res) => {
  const { symbol = 'SOLUSDT', interval = '1m', n = 200 } = req.body || {};
  // sugeneruok paprastas 1m žvakes
  const now = Date.now();
  const candles = Array.from({ length: n }, (_, i) => {
    const ts = now - (n - i) * 60_000;
    const open = 100 + Math.sin(i / 10) * 2 + Math.random();
    const close = open + (Math.random() - 0.5) * 0.8;
    const high = Math.max(open, close) + Math.random();
    const low = Math.min(open, close) - Math.random();
    return { ts, timestamp: ts, open, high, low, close };
  });
  const signals = generateSignals(candles, { symbol, interval, strategy: 'dev-smoke' });
  res.json({ ok: true, count: signals.length });
});
