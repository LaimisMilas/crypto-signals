import { E2E_EQUITY } from './analytics.e2e-dataset.js';

function getDataset() {
  if (window.__E2E__) return Promise.resolve(E2E_EQUITY);
  return fetch('/data/analytics-equity.json').then(r => r.json());
}

async function renderChart() {
  const canvas = document.querySelector('[data-equity-canvas]');
  if (!canvas || !(window as any).Chart) return;
  const points = await getDataset();
  const labels = points.map(p => new Date(p.ts));
  const data = points.map(p => p.equity);
  const cfg = {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Equity',
        data,
        borderWidth: window.__E2E__ ? 1 : 3,
        pointRadius: window.__E2E__ ? 0 : undefined,
        tension: window.__E2E__ ? 0 : 0.4,
      }],
    },
    options: {
      animation: window.__E2E__ ? false : undefined,
    },
  };
  new Chart(canvas.getContext('2d'), cfg);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderChart);
} else {
  renderChart();
}
