import { cfg } from '../config.js';
import { db, init as initDb } from '../storage/db.js';
import { fetchKlines, openKlineStream } from '../exchange/binance.js';
import { evaluate } from '../strategy/sidewaysReversal.js';
import { notifyPublic, notifyPrivate } from '../notify/telegram.js';
import { noteSignal, noteMissingCandles, noteDataStaleness } from '../signal/instrumentation.js';

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
  const intervalSec = { '1m': 60, '3m': 180, '5m': 300 }[cfg.interval] || 60;

  openKlineStream(async (c) => {
    await upsertCandle(c);
    if (c.closed) {
      const prev = buffer[buffer.length-1];
      if (prev && c.ts - prev.ts > intervalSec) {
        const gaps = Math.floor((c.ts - prev.ts) / intervalSec) - 1;
        if (gaps > 0) noteMissingCandles(cfg.symbol, cfg.interval, gaps);
      }
      buffer.push(c);
      if (buffer.length > 400) buffer.shift();
      noteDataStaleness(cfg.symbol, cfg.interval, Math.floor(Date.now()/1000 - c.ts));

      const signal = await evaluate(buffer);
      if (signal) {
        noteSignal({ strategy: 'sidewaysReversal', symbol: cfg.symbol, interval: cfg.interval, side: signal.type });
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
