import { db } from '../storage/db.js';

export async function latestPrices(symbols = []) {
  if (symbols.length === 0) {
    const { rows } = await db.query(`
      SELECT DISTINCT ON (symbol) symbol, close AS price, ts
      FROM candles
      ORDER BY symbol, ts DESC
    `);
    return Object.fromEntries(rows.map(r => [r.symbol, Number(r.price)]));
  }
  const { rows } = await db.query(`
      SELECT DISTINCT ON (symbol) symbol, close AS price, ts
      FROM candles
      WHERE symbol = ANY($1)
      ORDER BY symbol, ts DESC
    `, [symbols]);
  return Object.fromEntries(rows.map(r => [r.symbol, Number(r.price)]));
}

export default { latestPrices };
