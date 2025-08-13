import axios from 'axios';
import WebSocket from 'ws';
import { cfg } from '../config.js';

export async function fetchKlines({ limit = 500 } = {}) {
  const url = `${cfg.binanceBase}/api/v3/klines`;
  const { data } = await axios.get(url, {
    params: { symbol: cfg.symbol, interval: cfg.interval, limit }
  });
  return data.map(k => ({
    ts: k[0],
    open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5]
  }));
}

export function openKlineStream(onCandle) {
  const stream = `${cfg.symbol}`.toLowerCase() + '@kline_' + cfg.interval;
  const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${stream}`);
  ws.on('message', (msg) => {
    const j = JSON.parse(msg);
    if (!j.k) return;
    const k = j.k;
    const candle = {
      ts: k.t, open: +k.o, high: +k.h, low: +k.l, close: +k.c, volume: +k.v, closed: k.x
    };
    onCandle(candle);
  });
  ws.on('error', (e) => console.error('WS error', e.message));
  ws.on('close', () => console.log('WS closed'));
  return ws;
}
