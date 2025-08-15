import https from 'https';

const BASE = 'https://api.binance.com';

export async function fetchKlines(symbol, interval, startMs, endMs) {
  const params = new URLSearchParams({
    symbol,
    interval,
    startTime: String(startMs),
    endTime: String(endMs),
    limit: '1000'
  });

  const url = `${BASE}/api/v3/klines?${params.toString()}`;
  const body = await httpGet(url);
  const arr = JSON.parse(body);
  // Binance kline formatas:
  // [ openTime, open, high, low, close, volume, closeTime, ... ]
  return arr.map(k => ({
    ts: k[0], // openTime ms
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
    volume: Number(k[5]),
  }));
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(data);
        else reject(new Error(`HTTP ${res.statusCode}: ${data}`));
      });
    }).on('error', reject);
  });
}
