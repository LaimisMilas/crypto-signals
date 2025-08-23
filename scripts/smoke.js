const base = process.env.SMOKE_URL;
const get = async (p) => {
  const res = await fetch(base + p);
  return res.ok;
};

(async () => {
  const checks = [
    ['/healthz', true],
    ['/readyz', true],
  ];
  for (const [p, must] of checks) {
    const ok = await get(p);
    if (must && !ok) {
      console.error('Fail:', p);
      process.exit(1);
    }
  }
  process.exit(0);
})();
