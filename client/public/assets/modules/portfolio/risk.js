/* eslint-env browser */
export async function mount(root){
  root.innerHTML = `<div id="risk-cards" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px"></div>
  <div style="margin-top:12px"><canvas id="risk-bars" height="280"></canvas></div>
  <div style="margin-top:12px"><button id="risk-refresh" class="btn">Refresh</button></div>`;

  const Chart = window.Chart;
  const ctx = root.querySelector('#risk-bars').getContext('2d');

  async function load(){
    const j = await fetch('/portfolio').then(r=>r.json());
    const { gross, net, estVaR, largestWeight } = j.risk;
    const cards = [
      ['Gross', gross.toFixed(2)],
      ['Net', net.toFixed(2)],
      ['Est. 1d VaR', estVaR.toFixed(2)],
      ['Largest pos %', (largestWeight*100).toFixed(1)+'%']
    ].map(([k,v])=> `<div class="card" style="padding:10px;border:1px solid #222;border-radius:10px"><div>${k}</div><b>${v}</b></div>`).join('');
    root.querySelector('#risk-cards').innerHTML = cards;

    const alloc = j.allocation.bySymbol;
    if (root._bar) root._bar.destroy();
    root._bar = new Chart(ctx, {
      type:'bar',
      data:{ labels: alloc.map(x=>x.symbol), datasets:[{ label:'Weight %', data: alloc.map(x=>+(x.weight*100).toFixed(2)) }] },
      options:{ plugins:{ legend:{ display:false } }, scales:{ y:{ beginAtZero:true, ticks:{ callback:v=>v+'%' } } } }
    });
  }

  root.querySelector('#risk-refresh').addEventListener('click', load);
  await load();
  return { unmount(){ try{ root._bar?.destroy(); }catch{} } };
}
