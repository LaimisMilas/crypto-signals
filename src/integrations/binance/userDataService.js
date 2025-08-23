import EventEmitter from 'events';
import WebSocket from 'ws';
import binance from './client.js';
import { db } from '../../storage/db.js';

const WS_BASE = 'wss://fstream.binancefuture.com/ws';
const BACKOFF = [2000, 5000, 10000, 30000, 60000];

class UserDataService extends EventEmitter {
  constructor() {
    super();
    this.listenKey = null;
    this.ws = null;
    this.keepAliveTimer = null;
    this.reconnectTimer = null;
    this.backoffIdx = 0;
  }

  status() {
    return {
      listenKey: this.listenKey,
      connected: this.ws?.readyState === WebSocket.OPEN,
    };
  }

  async start() {
    if (!this.listenKey) {
      await this._refreshListenKey();
    }
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this._connectWs();
    }
    if (!this.keepAliveTimer) {
      this.keepAliveTimer = setInterval(() => this.keepAlive(), 30 * 60 * 1000).unref();
    }
    return this.listenKey;
  }

  async _refreshListenKey() {
    const data = await binance.send('POST', '/fapi/v1/listenKey', {}, { signed: true });
    this.listenKey = data.listenKey;
    this.emit('user:listenKey', { state: 'connected', listenKey: this.listenKey });
  }

  async _connectWs() {
    if (!this.listenKey) await this._refreshListenKey();
    const url = `${WS_BASE}/${this.listenKey}`;
    this.ws = new WebSocket(url);

    this.ws.on('open', () => {
      this.backoffIdx = 0;
      this.emit('user:listenKey', { state: 'connected' });
    });

    this.ws.on('message', (raw) => this._handleMessage(raw));

    this.ws.on('close', () => {
      this.emit('user:listenKey', { state: 'reconnecting' });
      this._scheduleReconnect();
    });

    this.ws.on('error', () => {
      // handled by close
    });
  }

  _scheduleReconnect() {
    const delay = BACKOFF[this.backoffIdx] || BACKOFF[BACKOFF.length - 1];
    if (this.backoffIdx < BACKOFF.length - 1) this.backoffIdx += 1;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this._reconnect(), delay).unref();
  }

  async _reconnect() {
    try {
      await this._refreshListenKey();
      await this._connectWs();
    } catch {
      this._scheduleReconnect();
    }
  }

  async keepAlive() {
    if (!this.listenKey) return;
    try {
      await binance.send('PUT', '/fapi/v1/listenKey', { listenKey: this.listenKey }, { signed: true });
    } catch (e) {
      // if keepalive fails, force reconnect
      console.error('keepAlive failed', e.message);
      await this._reconnect();
    }
  }

  async stop() {
    if (this.keepAliveTimer) { clearInterval(this.keepAliveTimer); this.keepAliveTimer = null; }
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }
    if (this.listenKey) {
      try { await binance.send('DELETE', '/fapi/v1/listenKey', { listenKey: this.listenKey }, { signed: true }); } catch {}
    }
    this.listenKey = null;
    this.emit('user:listenKey', { state: 'stopped' });
  }

  _handleMessage(raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (msg.e === 'ORDER_TRADE_UPDATE') {
      const o = msg.o || {};
      const evt = {
        type: 'ORDER',
        T: msg.T,
        s: o.s,
        S: o.S,
        X: o.X,
        x: o.x,
        i: o.i,
        q: o.q,
        z: o.z,
        ap: o.ap,
        L: o.L,
        l: o.l,
        rp: o.rp,
        ps: o.ps,
      };
      this.emit('user:order_trade_update', evt);
      this._applyOrderUpdate(evt).catch(err => console.error('order update db error', err));
    } else if (msg.e === 'ACCOUNT_UPDATE') {
      const evt = {
        type: 'ACCOUNT',
        T: msg.T,
        balances: (msg.a?.B || []).map(b => ({ asset: b.a, walletBalance: b.wb, crossWallet: b.cw })),
        positions: (msg.a?.P || []).map(p => ({ s: p.s, pa: p.pa, ep: p.ep, up: p.up, mt: p.mt })),
      };
      this.emit('user:account_update', evt);
    }
  }

  async _applyOrderUpdate(o) {
    // Basic sync of fills to paper_trades table
    if (o.X === 'PARTIALLY_FILLED' || o.X === 'FILLED') {
      const qty = Number(o.z || 0);
      await db.query(
        `UPDATE paper_trades SET size=$1 WHERE status='OPEN' AND symbol=$2 ORDER BY id DESC LIMIT 1`,
        [qty, o.s]
      );
    }
    if (o.X === 'FILLED' && o.x === 'TRADE') {
      const price = Number(o.ap || o.L || 0);
      const ts = Number(o.T);
      const rp = Number(o.rp || 0);
      if (o.S === 'BUY') {
        await db.query(
          `UPDATE paper_trades SET entry_price=$1, opened_at=$2 WHERE status='OPEN' AND symbol=$3 ORDER BY id DESC LIMIT 1`,
          [price, ts, o.s]
        );
      } else {
        await db.query(
          `UPDATE paper_trades SET exit_price=$1, closed_at=$2, pnl=COALESCE(pnl,0)+$3, status='CLOSED' WHERE status='OPEN' AND symbol=$4 ORDER BY id ASC LIMIT 1`,
          [price, ts, rp, o.s]
        );
      }
    }
  }
}

const svc = new UserDataService();
export default svc;
