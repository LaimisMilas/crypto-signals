#!/usr/bin/env node
import fs from 'fs';
import 'dotenv/config';
import { Pool } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateSignals } from '../src/strategy.js';

// optional 3rd CLI argument overrides adxMin from params.json
const [,, start='2024-01-01', end='2024-03-01', adxArg] = process.argv;

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

    // Sukonstruojam candles masyvą strategijai
    const candles = rows.map(r => ({
        ts: Number(r.ts),
        open: Number(r.open),
        high: Number(r.high),
        low: Number(r.low),
        close: Number(r.close),
        volume: Number(r.volume),
    }));

    // params iš config/params.json
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const paramsPath = path.join(__dirname, '..', 'config', 'params.json');
    const params = JSON.parse(fs.readFileSync(paramsPath, 'utf-8'));
    if (adxArg !== undefined) params.adxMin = Number(adxArg);
    const { trades, pnl } = generateSignals(candles, params);

// --- NEW: metrikos
    const closed = trades.filter(t => 'pnl' in t);
    const wins = closed.filter(t => t.pnl > 0).length;
    const losses = closed.filter(t => t.pnl <= 0).length;
    const winRate = closed.length ? (wins / closed.length) * 100 : 0;

// equity curve
    let eq = 0;
    const equity = [];
    for (const t of trades) {
        if ('pnl' in t) eq += t.pnl;
        equity.push({ ts: Number(t.ts), equity: eq });
    }

// max drawdown
    let peak = -Infinity, maxDD = 0;
    for (const p of equity) {
        if (p.equity > peak) peak = p.equity;
        const dd = peak - p.equity;
        if (dd > maxDD) maxDD = dd;
    }

// išsaugom
    fs.writeFileSync('metrics.json', JSON.stringify({
        trades: trades.length,
        closedTrades: closed.length,
        pnl,
        winRate: Number(winRate.toFixed(2)),
        maxDrawdown: Number(maxDD.toFixed(2))
    }, null, 2));

    let csv = 'ts,equity\n' + equity.map(r => `${r.ts},${r.equity}`).join('\n');
    fs.writeFileSync('backtest.csv', csv);

    console.log(`Trades: ${trades.length}, Closed: ${closed.length}, WinRate: ${winRate.toFixed(1)}%, PnL: ${pnl.toFixed(2)}, MaxDD: ${maxDD.toFixed(2)}`);
    console.log('Saved: metrics.json, backtest.csv');

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
