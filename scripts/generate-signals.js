#!/usr/bin/env node
import 'dotenv/config';
import { Pool } from 'pg';
import { rsi, atr } from '../src/backtest/indicators.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async ()=>{
    const end = Date.now();
    const start = end - 90*24*3600*1000; // 90 dienų
    const { rows } = await pool.query(
        `SELECT ts, open, high, low, close FROM candles
     WHERE ts >= $1::bigint AND ts < $2::bigint ORDER BY ts ASC`,
        [start, end]
    );
    const ts=rows.map(r=>+r.ts), h=rows.map(r=>+r.high), l=rows.map(r=>+r.low), c=rows.map(r=>+r.close);
    const r14 = rsi(c,14), a14 = atr(h,l,c,14);

    const last = ts.length-1;
    const r = r14[last], a = a14[last];
    if (r == null || a == null) { console.log('Neužtenka duomenų'); process.exit(0); }

    let type=null, reason='';
    if (r <= 30) { type='BUY'; reason=`RSI=${r.toFixed(1)}<=30`; }
    else if (r >= 70) { type='SELL'; reason=`RSI=${r.toFixed(1)}>=70`; }

    if (type) {
        await pool.query(
            `INSERT INTO signals (ts, type, price, rsi, atr, aroon_up, aroon_down, reason)
       VALUES ($1,$2,$3,$4,$5,NULL,NULL,$6)
       ON CONFLICT DO NOTHING`,
            [ts[last], type, c[last], r, a, reason]
        );
        console.log(`Signal: ${type} @ ${c[last]} (${reason})`);
    } else {
        console.log('No signal');
    }

    await pool.end();
})();
