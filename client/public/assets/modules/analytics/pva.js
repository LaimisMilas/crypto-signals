/* eslint-env browser */
export async function mount(root){
  const Chart = window.Chart || (await import('/assets/vendor/chart.umd.js')).default;
  let canvas = root.querySelector('canvas');
  if (!canvas){
    canvas = document.createElement('canvas');
    root.appendChild(canvas);
  }
  const chart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: { labels: ['Jan','Feb','Mar'], datasets: [
      { label: 'Plan', data: [1,1,1] },
      { label: 'Actual', data: [1,2,1] }
    ] },
    options: { responsive: true }
  });
  return {
    unmount(){
      try { chart.destroy(); } catch { /* ignore */ }
      root.innerHTML = '';
    }
  };
}
