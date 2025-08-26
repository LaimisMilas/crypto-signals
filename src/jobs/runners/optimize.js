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
  await writeCSV(job.id, job.type, 'optimize_results.csv', 'params,metric\n', 'Optimize Results');
  const result = { best: null };
  await writeJSON(job.id, job.type, 'best_params.json', result, 'Best Params');

  // Create a dummy TOP-K equity artifact so that the analytics UI can
  // display inline overlays without running extra backtests. In the real
  // application this would be generated from actual optimization results.
  const topN = 5;
  const now = Date.now();
  const items = [];
  for (let i = 0; i < topN; i++) {
    const eq = [];
    for (let d = 0; d < 10; d++) {
      eq.push({ ts: now + d * 86400000, equity: 100 + i * 10 + d });
    }
    items.push({
      label: `fast=${10 + i},slow=${50 + i * 5}`,
      params: { fast: 10 + i, slow: 50 + i * 5 },
      equity: eq,
    });
  }
  await writeJSON(job.id, job.type, 'optimize_topk_equity.json', items, 'optimize_topk_equity');

  return result;
}
