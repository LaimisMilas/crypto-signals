export function calcReturn(equity){
  if (!equity?.length) return null;
  const y0 = equity[0].equity;
  const yN = equity[equity.length - 1].equity;
  if (!y0 || !yN) return null;
  return yN / y0 - 1;
}

export function calcMaxDD(equity){
  if (!equity?.length) return null;
  let peak = -Infinity;
  let dd = 0;
  for (const p of equity){
    peak = Math.max(peak, p.equity);
    dd = Math.min(dd, p.equity / peak - 1);
  }
  return dd;
}

export function summarizeSeries(series){
  return series.map(s => ({
    jobId: s.jobId ?? null,
    label: s.label ?? (s.jobId ? `#${s.jobId}` : 'overlay'),
    from: s.equity?.[0]?.ts ?? null,
    to: s.equity?.[s.equity.length - 1]?.ts ?? null,
    n: s.equity?.length ?? 0,
    return: calcReturn(s.equity),
    maxDD: calcMaxDD(s.equity),
  }));
}

export function withBaselineDelta(summaries, baseline){
  if (!baseline) return summaries;
  const b = { return: calcReturn(baseline.equity), maxDD: calcMaxDD(baseline.equity) };
  return summaries.map(x => ({
    ...x,
    deltaReturn: (x.return != null && b.return != null) ? (x.return - b.return) : null,
    deltaMaxDD: (x.maxDD != null && b.maxDD != null) ? (x.maxDD - b.maxDD) : null
  }));
}
