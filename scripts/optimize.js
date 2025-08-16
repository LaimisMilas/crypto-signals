#!/usr/bin/env node
import 'dotenv/config';
import { Pool } from 'pg';
import { rsi, atr } from '../src/backtest/indicators.js';
import { runBacktest } from '../src/backtest/engine.js';

const [,, start='2024-01-01', end='2024-03-01'] = process.argv;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function loadCandles(s,e){
    const { rows } = await pool.query(
        `SELECT ts, open, high, low, close FROM candles
     WHERE ts >= $1::bigint AND ts < $2::bigint ORDER BY ts ASC`,
        [Date.parse(s), Date.parse(e)]
    );
    return rows;
}

function metricScore({ pnl, maxDD }) {
    // paprastas Sharpe-ish: PnL / (1+DD)
    return pnl / (1 + Math.max(0, maxDD));
}

(async ()=>{
    const rows = await loadCandles(start, end);
    const ts=rows.map(r=>+r.ts), o=rows.map(r=>+r.open), h=rows.map(r=>+r.high), l=rows.map(r=>+r.low), c=rows.map(r=>+r.close);
    const r14 = rsi(c,14), a14 = atr(h,l,c,14);

    const results = [];
    for (const rBuy of [25,30,35]) {
        for (const rSell of [65,70,75]) {
            for (const mult of [1.5,2,2.5]) {
                const { trades, pnl } = runBacktest({ ts, open:o, high:h, low:l, close:c }, { rsiArr:r14, atrArr:a14 }, { rsiBuy:rBuy, rsiSell:rSell, atrMult:mult });
                // maxDD
                let eq=0, peak=-Infinity, maxDD=0;
                for (const t of trades) {
                    if ('pnl' in t) eq += t.pnl;
                    if (eq>peak) peak=eq;
                    const dd=peak-eq; if (dd>maxDD) maxDD=dd;
                }
                results.push({ rBuy, rSell, mult, pnl:+pnl.toFixed(2), maxDD:+maxDD.toFixed(2), score:+metricScore({pnl, maxDD}).toFixed(4) });
            }
        }
    }
    results.sort((a,b)=>b.score-a.score);
    console.table(results.slice(0,10));
    await pool.end();
})();
