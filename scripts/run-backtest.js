import fs from 'fs';
import { runBacktest } from '../src/backtest/engine.js';

const file = process.argv[2] || 'candles.json';
const candles = JSON.parse(fs.readFileSync(file, 'utf-8'));

const results = runBacktest(candles);
console.log(results);

