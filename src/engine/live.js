import { cfg } from '../config.js';
import { db, init as initDb } from '../storage/db.js';
import { fetchKlines, openKlineStream } from '../exchange/binance.js';
import { evaluate } from '../strategy/sidewaysReversal.js';
import { notifyPublic, notifyPrivate } from '../notify/telegram.js';

initDb();

function upsertCandle(c) {
  db.run(
    `INSERT OR IGNORE INTO candles (ts,open,high,low,close,volume) VALUES (?,?,?,?,?,?)`,
    [c.ts, c.open, c.high, c.low, c.close, c.volume]
  );
  db.run(
    `UPDATE candles SET open=?,high=?,low=?,close=?,volume=? WHERE ts=?`,
    [c.open, c.high, c.low, c.close, c.volume, c.ts]
  );
}

function saveSignal(s, ts) {
  db.run(
    `INSERT INTO signals (ts,type,price,rsi,atr,aroon_up,aroon_down,reason) VALUES (?,?,?,?,?,?,?,?)`,
    [ts, s.type, s.entry, s.rsi, s.atr, s.aroon_up, s.aroon_down, s.reason]
  );
}

(async () => {
  const hist = await fetchKlines({ limit: 600 });
  hist.forEach(upsertCandle);

  const buffer = hist.slice(-300);

  openKlineStream(async (c) => {
    upsertCandle(c);
    if (c.closed) {
      buffer.push(c);
      if (buffer.length > 400) buffer.shift();

      const signal = evaluate(buffer);
      if (signal) {
        saveSignal(signal, c.ts);
        const txt = `*${cfg.symbol}* ${signal.type}\n` +
          `Price: ${signal.entry}\nRSI: ${signal.rsi?.toFixed(1)} ATR: ${signal.atr?.toFixed(4)}\n` +
          `Reason: ${signal.reason}`;
        await notifyPublic(`${cfg.symbol} ${signal.type} @ ${signal.entry}`);
        await notifyPrivate(txt);
        console.log('Signal:', txt);
      }
    }
  });

  console.log('Live engine started.');
})();
