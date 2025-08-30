// Simplification and caching helpers for overlay performance data.
// Douglas–Peucker implementation and a tiny in-memory cache.

export function simplify(points, eps){
  if (points.length <= 2) return points;
  const sq = x => x * x;
  const d2 = (a, b, p) => {
    const A = { x: a.ts, y: a.equity };
    const B = { x: b.ts, y: b.equity };
    const P = { x: p.ts, y: p.equity };
    const dx = B.x - A.x;
    const dy = B.y - A.y;
    if (dx === 0 && dy === 0) return sq(P.x - A.x) + sq(P.y - A.y);
    const t = ((P.x - A.x) * dx + (P.y - A.y) * dy) / (dx * dx + dy * dy);
    const t2 = Math.max(0, Math.min(1, t));
    const X = A.x + t2 * dx;
    const Y = A.y + t2 * dy;
    return sq(P.x - X) + sq(P.y - Y);
  };
  const rec = (pts, a, b, eps2, out) => {
    let imax = -1;
    let dmax = -1;
    for (let i = a + 1; i < b; i++) {
      const d = d2(pts[a], pts[b], pts[i]);
      if (d > dmax) { dmax = d; imax = i; }
    }
    if (dmax > eps2) {
      rec(pts, a, imax, eps2, out);
      rec(pts, imax, b, eps2, out);
    } else {
      out.push(pts[a]);
      if (b === pts.length - 1) out.push(pts[b]);
    }
  };
  const out = [];
  rec(points, 0, points.length - 1, eps * eps, out);
  return out;
}

const cache = new Map();
const TTL = 10 * 60 * 1000;

export function getCache(key){
  const v = cache.get(key);
  if (v && Date.now() - v.ts < TTL) return v.data;
  return null;
}

export function setCache(key, data){
  cache.set(key, { data, ts: Date.now() });
}

export function lttb(points, threshold){
  const n = points.length;
  if (threshold >= n || threshold <= 0) return points;
  const sampled = [points[0]];
  const every = (n - 2) / (threshold - 2);
  let a = 0;
  for (let i = 0; i < threshold - 2; i++) {
    const start = Math.floor((i + 1) * every) + 1;
    const end = Math.min(Math.floor((i + 2) * every) + 1, n);
    let avgX = 0, avgY = 0;
    const avgrange = end - start;
    for (let j = start; j < end; j++) {
      avgX += points[j].ts;
      avgY += points[j].equity;
    }
    avgX /= avgrange || 1;
    avgY /= avgrange || 1;
    let maxArea = -1;
    let nextA = start;
    for (let j = start; j < end; j++) {
      const area = Math.abs((points[a].ts - avgX) * (points[j].equity - points[a].equity) -
                           (points[a].ts - points[j].ts) * (avgY - points[a].equity));
      if (area > maxArea) { maxArea = area; nextA = j; }
    }
    sampled.push(points[nextA]);
    a = nextA;
  }
  sampled.push(points[n-1]);
  return sampled;
}
