import axios from 'axios';
import crypto from 'crypto';

const BASE_URL = process.env.BINANCE_BASE_URL || 'https://testnet.binancefuture.com';
const API_KEY = process.env.BINANCE_API_KEY || '';
const API_SECRET = process.env.BINANCE_API_SECRET || '';
const RECV_WINDOW = Number(process.env.BINANCE_RECV_WINDOW) || 5000;

const http = axios.create({ baseURL: BASE_URL, timeout: 10000 });

let timeOffset = 0;

async function timeSync() {
  try {
    const res = await http.get('/fapi/v1/time');
    const serverTime = res.data.serverTime;
    timeOffset = serverTime - Date.now();
  } catch (e) {
    // ignore
  }
}

// sync now and every 60s
setInterval(timeSync, 60_000).unref();
timeSync();

function buildQuery(params = {}) {
  return Object.keys(params)
    .filter(k => params[k] !== undefined && params[k] !== null)
    .sort()
    .map(k => `${k}=${encodeURIComponent(params[k])}`)
    .join('&');
}

function sign(query) {
  return crypto.createHmac('sha256', API_SECRET).update(query).digest('hex');
}

async function send(method, path, params = {}, opts = {}) {
  const { signed = false } = opts;
  const q = { ...params };
  const headers = {};

  if (signed) {
    q.timestamp = Date.now() + timeOffset;
    q.recvWindow = RECV_WINDOW;
  }

  let qs = buildQuery(q);
  if (signed) {
    qs = qs ? `${qs}&signature=${sign(qs)}` : `signature=${sign('')}`;
    headers['X-MBX-APIKEY'] = API_KEY;
  }

  let url = path;
  let data;
  if (method === 'GET' || method === 'DELETE') {
    if (qs) url += `?${qs}`;
  } else {
    data = qs;
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
  }

  for (let attempts = 0; attempts < 3; attempts++) {
    try {
      const res = await http.request({ method, url, data, headers });
      return res.data;
    } catch (err) {
      const status = err.response?.status;
      if ((status === 429 || status === 418) && attempts < 2) {
        const delay = 500 + Math.random() * 1000;
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err.response?.data || err;
    }
  }
}

function getTimeOffset() {
  return timeOffset;
}

export default { send, timeSync, getTimeOffset };
