import { Router } from 'express';
import binance from './client.js';

const router = Router();

router.get('/ping', async (_req, res) => {
  try {
    const [ping, time] = await Promise.all([
      binance.send('GET', '/fapi/v1/ping'),
      binance.send('GET', '/fapi/v1/time'),
    ]);
    res.json({ ping, time, timeOffset: binance.getTimeOffset() });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

router.get('/account', async (_req, res) => {
  try {
    const data = await binance.send('GET', '/fapi/v2/account', {}, { signed: true });
    res.json(data);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

router.get('/open-orders', async (req, res) => {
  try {
    const { symbol } = req.query;
    const data = await binance.send('GET', '/fapi/v1/openOrders', { symbol }, { signed: true });
    res.json(data);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

router.get('/positions', async (req, res) => {
  try {
    const { symbol } = req.query;
    const data = await binance.send('GET', '/fapi/v2/positionRisk', { symbol }, { signed: true });
    res.json(data);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

router.post('/order', async (req, res) => {
  try {
    const { symbol, side, type = 'MARKET', quantity, price, dryRun = true, timeInForce = 'GTC', reduceOnly = false } = req.body;
    const common = { symbol, side, type, quantity, reduceOnly };
    const payload = (type === 'LIMIT') ? { ...common, price, timeInForce } : common;
    const path = dryRun ? '/fapi/v1/order/test' : '/fapi/v1/order';
    const data = await binance.send('POST', path, payload, { signed: true });
    res.json({ ok: true, dryRun, data });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

router.delete('/order', async (req, res) => {
  try {
    const { symbol, orderId, origClientOrderId } = req.query;
    const data = await binance.send('DELETE', '/fapi/v1/order', { symbol, orderId, origClientOrderId }, { signed: true });
    res.json(data);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

export default router;
