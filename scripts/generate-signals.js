#!/usr/bin/env node
import 'dotenv/config';
import { Pool } from 'pg';
import { rsi, atr, ema, adx } from '../src/backtest/indicators.js';
import https from 'https';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// NAUJOS strategijos reikšmės (iš tavo geriausio rinkinio)
const PARAMS = {
    rsiBuy: 25,
    rsiSell: 65,
    atrMult: 2,
    adxMin: 15,          // jei bus per mažai signalų – bandyk 12/13/14
    useTrendFilter: true
};

function tgSend(text) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_PRIVATE_CHAT_ID;
    if (!token || !chatId) return Promise.resolve();
    const data = new URLSearchParams({ chat_id: chatId, text, parse_mode: 'HTML' }).toString();
    const options = {
        hostname: 'api.telegram.org',
        path: `/bot${token}/sendMessage`,
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', 'content-length': Buffer.byteLength(data) }
    };
    return new Promise((resolve, reject) => {
        const req = https.request(options, res => { res.on('data', ()=>{}); res.on('end', resolve); });
        req.on('error', reject); req.write(data); req.end();
    });
}

(async ()=>{
    const end = Date.parse("2024-05-01T00:00:00.000Z");
    const start = end - 120*24*3600*1000; // 120 d. istorija indikatorių „įsivažiavimui“
    const { rows } = await pool.query(
        `SELECT ts, open, high, low, close, volume
     FROM candles
     WHERE ts >= $1::bigint AND ts < $2::bigint
     ORDER BY ts ASC`, [start, end]
    );

    if (rows.length < 300) { console.log('Per mažai žvakių.'); process.exit(0); }

    const candles = rows.map(r => ({
        ts: +r.ts, open: +r.open, high: +r.high, low: +r.low, close: +r.close, volume: +r.volume
    }));
    const ts = candles.map(c=>c.ts), h=candles.map(c=>c.high), l=candles.map(c=>c.low), c=candles.map(c=>c.close);

    const rsiArr = rsi(c,14);
    const atrArr = atr(h,l,c,14);
    const emaArr = ema(c,200);
    const adxArr = adx(candles,14);

    const last = candles.length-1;
    const r = rsiArr[last], a = atrArr[last], e = emaArr[last], A = adxArr[last];
    if (r==null || a==null || e==null) { console.log('Indikatoriai dar neparuošti.'); process.exit(0); }

    // Filtrai: EMA (trend) + ADX (stiprumas)
    if (PARAMS.useTrendFilter && !(c[last] > e)) { console.log('Trend filtras atmetė.'); process.exit(0); }
    if (A != null && A < PARAMS.adxMin) { console.log(`ADX ${A.toFixed(1)} < ${PARAMS.adxMin} – atmetam.`); process.exit(0); }

    let type=null, reason='';
    if (r <= PARAMS.rsiBuy) { type='BUY'; reason = `RSI=${r.toFixed(1)}<=${PARAMS.rsiBuy}, ADX=${A?.toFixed(1)}`; }
    else if (r >= PARAMS.rsiSell) { type='SELL'; reason = `RSI=${r.toFixed(1)}>=${PARAMS.rsiSell}, ADX=${A?.toFixed(1)}`; }

    if (!type) { console.log('No signal'); process.exit(0); }

    const price = c[last];

    // Įrašas į DB (idempotentiškai)
    await pool.query(
        `INSERT INTO signals (ts, type, price, rsi, atr, aroon_up, aroon_down, reason)
     VALUES ($1,$2,$3,$4,$5,NULL,NULL,$6)
     ON CONFLICT DO NOTHING`,
        [ts[last], type, price, r, a, reason]
    );

    // Telegram pranešimas
    const msg = `<b>${type}</b> @ ${price.toFixed(2)}\nRSI: ${r.toFixed(1)}  ADX: ${A?.toFixed(1)}\nTS: ${new Date(ts[last]).toISOString()}`;
    await tgSend(msg);

    console.log(`Signal sent: ${type} ${price.toFixed(2)} | ${reason}`);
    await pool.end();
})().catch(async e=>{ console.error(e); await pool.end(); process.exit(1); });
