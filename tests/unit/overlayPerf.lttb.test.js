import { lttb } from '../../src/services/overlayPerf.js';

test('lttb keeps first/last and reduces points', () => {
  const pts = Array.from({length: 5000}, (_,i)=>({ ts:i, equity: Math.sin(i/20) + i/100 }));
  const out = lttb(pts, 500);
  expect(out.length).toBeLessThan(pts.length);
  expect(out[0]).toEqual(pts[0]);
  expect(out[out.length-1]).toEqual(pts[pts.length-1]);
});
