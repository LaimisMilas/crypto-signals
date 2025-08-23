import { writeCSV, writeJSON } from '../fs.js';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

export async function run(job, { log, progress, signal }) {
  log('info', `backtest start for ${job.params?.symbol || ''}`);
  for (let i = 0; i < 5; i++) {
    if (signal?.aborted) throw new Error('canceled');
    await sleep(200);
    progress((i + 1) / 5);
    log('info', `step ${i + 1}`);
  }
  const tradesCsv = 'id,ts,side,qty,price\n';
  await writeCSV(job.id, 'trades.csv', tradesCsv, 'Trades');
  const result = { trades: 0 };
  await writeJSON(job.id, 'stats.json', result, 'Stats');
  return result;
}
