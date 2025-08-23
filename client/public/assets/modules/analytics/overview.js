/* eslint-env browser */
export async function mount(root){
  const Chart = window.Chart || (await import('/assets/vendor/chart.umd.js')).default;
  let canvas = root.querySelector('canvas');
  if (!canvas){
    canvas = document.createElement('canvas');
    root.appendChild(canvas);
  }
  const chart = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: { labels: ['A','B','C'], datasets: [{ label: 'Overview', data: [1,2,3] }] },
    options: { responsive: true }
  });
  return {
    unmount(){
      try { chart.destroy(); } catch { /* ignore */ }
      root.innerHTML = '';
    }
  };
}
