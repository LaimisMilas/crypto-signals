import { writeCSV, writeJSON } from '../fs.js';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

export async function run(job, { log, progress, signal }) {
  const total = 5;
  for (let i = 0; i < total; i++) {
    if (signal?.aborted) throw new Error('canceled');
    await sleep(200);
    progress((i + 1) / total);
    log('info', `window ${i + 1} / ${total}`);
  }
  await writeCSV(job.id, 'wf_oos_equity.csv', 'ts,equity\n', 'WF Equity');
  const result = { windows: total };
  await writeJSON(job.id, 'wf_summary.json', result, 'WF Summary');
  return result;
}
