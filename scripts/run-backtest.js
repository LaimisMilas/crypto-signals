#!/usr/bin/env node
import 'dotenv/config';
import { Pool } from 'pg';
import { rsi, atr } from '../src/backtest/indicators.js';
import { runBacktest } from '../src/backtest/engine.js';

const [,, start='2024-01-01', end='2024-03-01'] = process.argv;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function main() {
    const rows = await selectCandles(start, end);
    if (rows.length < 100) {
        console.error('Per mažai žvakių backtestui');
        process.exit(1);
    }

    const ts = rows.map(r=>Number(r.ts));
    const open = rows.map(r=>Number(r.open));
    const high = rows.map(r=>Number(r.high));
    const low  = rows.map(r=>Number(r.low));
    const close= rows.map(r=>Number(r.close));

    const rsiArr = rsi(close, 14);
    const atrArr = atr(high, low, close, 14);

    const { trades, pnl } = runBacktest({ ts, open, high, low, close }, { rsiArr, atrArr }, {
        rsiBuy: 30,
        rsiSell: 70,
        atrMult: 2,
        positionSize: 1
    });

    console.log(`Trades: ${trades.length}, PnL: ${pnl.toFixed(2)}`);
    const last = trades.slice(-10);
    for (const t of last) {
        console.log(`${new Date(Number(t.ts)).toISOString()} ${t.side} ${t.price}${t.pnl!==undefined?` PnL=${t.pnl.toFixed(2)}`:''}`);
    }

    await pool.end();
}

async function selectCandles(start, end) {
    const client = await pool.connect();
    try {
        const q = `
      SELECT ts, open, high, low, close, volume
      FROM candles
      WHERE ts >= $1::bigint AND ts < $2::bigint
      ORDER BY ts ASC
    `;
        const startMs = Date.parse(start);
        const endMs   = Date.parse(end);
        const { rows } = await client.query(q, [startMs, endMs]);
        return rows;
    } finally {
        client.release();
    }
}

main().catch(e => { console.error(e); process.exit(1); });
