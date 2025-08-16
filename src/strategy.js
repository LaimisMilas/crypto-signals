// src/strategy.js
import { rsi, atr, ema } from './backtest/indicators.js';
import { adx } from './backtest/indicators.js';
import { runBacktest } from './backtest/engine.js';

/**
 * candles: [{ ts, open, high, low, close, volume }, ...]
 * params:
 *  - rsiBuy, rsiSell, atrMult
 *  - adxMin (pvz. 20)
 *  - useTrendFilter, feePct, slippagePct, positionSize
 */
export function generateSignals(candles, params = {}) {
    const {
        rsiBuy = 25,
        rsiSell = 65,
        atrMult = 2,
        adxMin = 20,
        useTrendFilter = true,
        feePct = 0.0005,
        slippagePct = 0.0005,
        positionSize = 1,
    } = params;

    const ts    = candles.map(c => Number(c.ts));
    const open  = candles.map(c => Number(c.open));
    const high  = candles.map(c => Number(c.high));
    const low   = candles.map(c => Number(c.low));
    const close = candles.map(c => Number(c.close));

    // Indikatoriai
    const rsiArr = rsi(close, 14);
    const atrArr = atr(high, low, close, 14);
    const emaArr = ema(close, 200);
    const adxArr = adx(candles, 14);

// ADX filtras: filtruojam tik jei ADX yra ir jis < adxMin
    const rsiMasked = rsiArr.map((v, i) => {
        const a = adxArr?.[i];
        if (a == null) return v;             // leisti signalus kol ADX dar nesusiformavo
        return (a >= adxMin) ? v : null;     // atmesti tik silpno trendo zonas
    });

    // Paleidžiam esamą engine
    const { trades, pnl } = runBacktest(
        { ts, open, high, low, close },
        { rsiArr: rsiMasked, atrArr, emaArr },
        { rsiBuy, rsiSell, atrMult, useTrendFilter, feePct, slippagePct, positionSize }
    );

    return { trades, pnl };
}
