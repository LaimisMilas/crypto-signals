import { writeCSV, writeJSON } from '../fs.js';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

export async function run(job, { log, progress, signal }) {
  const total = 5;
  for (let i = 0; i < total; i++) {
    if (signal?.aborted) throw new Error('canceled');
    await sleep(200);
    progress((i + 1) / total);
    log('info', `combo ${i + 1} / ${total}`);
  }
  await writeCSV(job.id, 'optimize_results.csv', 'params,metric\n', 'Optimize Results');
  const result = { best: null };
  await writeJSON(job.id, 'best_params.json', result, 'Best Params');
  return result;
}
