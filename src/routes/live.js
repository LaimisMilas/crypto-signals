import express from 'express';
import binance from '../integrations/binance/client.js';
import userData from '../integrations/binance/userDataService.js';

const router = express.Router();

router.get('/live/user-stream', async (_req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-store',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 3000\n\n');

  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  try {
    await userData.start();
  } catch (e) {
    send({ type: 'status', state: 'error', error: String(e) });
  }

  try {
    const [account, openOrders, positions] = await Promise.all([
      binance.send('GET', '/fapi/v2/account', {}, { signed: true }),
      binance.send('GET', '/fapi/v1/openOrders', {}, { signed: true }),
      binance.send('GET', '/fapi/v2/positionRisk', {}, { signed: true }),
    ]);
    send({ type: 'init', account, openOrders, positions });
  } catch (e) {
    send({ type: 'init', account: null, openOrders: [], positions: [], error: String(e) });
  }

  const onOrder = (data) => send({ type: 'order', ...data });
  const onAccount = (data) => send({ type: 'account', ...data });
  const onStatus = (data) => send({ type: 'status', ...data });

  userData.on('user:order_trade_update', onOrder);
  userData.on('user:account_update', onAccount);
  userData.on('user:listenKey', onStatus);

  const hb = setInterval(() => { res.write('event: ping\n\n'); }, 25000);

  _req.on('close', () => {
    clearInterval(hb);
    userData.off('user:order_trade_update', onOrder);
    userData.off('user:account_update', onAccount);
    userData.off('user:listenKey', onStatus);
    try { res.end(); } catch {}
  });
});

export function userStreamRoutes(app) {
  app.use(router);
}
