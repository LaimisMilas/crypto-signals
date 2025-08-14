import { cfg } from '../config.js';
import { db, init as initDb } from '../storage/db.js';
import { fetchKlines, openKlineStream } from '../exchange/binance.js';
import { evaluate } from '../strategy/sidewaysReversal.js';
import { notifyPublic, notifyPrivate } from '../notify/telegram.js';

async function upsertCandle(c) {
  await db.query(
    `INSERT INTO candles (ts, open, high, low, close, volume)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (ts) DO UPDATE SET
       open = EXCLUDED.open,
       high = EXCLUDED.high,
       low = EXCLUDED.low,
       close = EXCLUDED.close,
       volume = EXCLUDED.volume`,
    [c.ts, c.open, c.high, c.low, c.close, c.volume]
  );
}

async function saveSignal(s, ts) {
  await db.query(
    `INSERT INTO signals (ts, type, price, rsi, atr, aroon_up, aroon_down, reason)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [ts, s.type, s.entry, s.rsi, s.atr, s.aroon_up, s.aroon_down, s.reason]
  );
}

(async () => {
  await initDb();

  const hist = await fetchKlines({ limit: 600 });
  for (const c of hist) {
    await upsertCandle(c);
  }

  const buffer = hist.slice(-300);

  openKlineStream(async (c) => {
    await upsertCandle(c);
    if (c.closed) {
      buffer.push(c);
      if (buffer.length > 400) buffer.shift();

      const signal = evaluate(buffer);
      if (signal) {
        await saveSignal(signal, c.ts);
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
