import { db, init as initDb } from '../src/storage/db.js';
import { fetchKlines, upsertCandles } from '../src/data/binance.js';

const startArg = process.argv[2] ? parseInt(process.argv[2], 10) : undefined;

(async () => {
  await initDb();

  let startTime = startArg;
  while (true) {
    const candles = await fetchKlines({ startTime });
    if (candles.length === 0) break;
    await upsertCandles(db, candles);
    console.log(`Fetched ${candles.length} candles up to ${candles[candles.length - 1].ts}`);
    if (candles.length < 1000) break;
    startTime = candles[candles.length - 1].ts + 1;
  }

  await db.end();
})();
