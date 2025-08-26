/* eslint-env browser */
/* global Toast */
export async function mount(root){
  root.innerHTML = `<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start">
    <div><canvas id="alloc-sym" width="360" height="360"></canvas></div>
    <div><canvas id="alloc-str" width="360" height="360"></canvas></div>
  </div>
  <div style="margin-top:12px"><button id="alloc-refresh" class="btn">Refresh</button></div>
  <div id="alloc-table" style="margin-top:12px"></div>`;

  const Chart = window.Chart;
  const c1 = root.querySelector('#alloc-sym').getContext('2d');
  const c2 = root.querySelector('#alloc-str').getContext('2d');

  async function load(){
    const j = await fetch('/portfolio').then(r=>r.json());
    const sym = j.allocation.bySymbol;
    const str = j.allocation.byStrategy;

    const pie = (ctx, labels, weights, title)=> new Chart(ctx, {
      type:'doughnut',
      data:{ labels, datasets:[{ data: weights }] },
      options:{ plugins:{ legend:{ position:'bottom' }, title:{ display:true, text:title } } }
    });

    if (root._ch1) root._ch1.destroy();
    if (root._ch2) root._ch2.destroy();
    root._ch1 = pie(c1, sym.map(x=>x.symbol), sym.map(x=>+(x.weight*100).toFixed(2)), 'By Symbol (%)');
    root._ch2 = pie(c2, str.map(x=>x.strategy), str.map(x=>+(x.weight*100).toFixed(2)), 'By Strategy (%)');

    const rows = j.holdings.map(h=> `<tr>
      <td>${h.symbol}</td><td>${h.qty}</td><td>${h.avg_entry.toFixed(6)}</td>
      <td>${h.price.toFixed(6)}</td><td>${h.market_value.toFixed(2)}</td>
      <td>${h.unrealized_pnl.toFixed(2)}</td>
    </tr>`).join('');
    root.querySelector('#alloc-table').innerHTML = `
      <table class="tbl">
        <thead><tr><th>Symbol</th><th>Qty</th><th>Avg Entry</th><th>Price</th><th>MV</th><th>Unrealized P&L</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="6" style="opacity:.6">No open positions</td></tr>'}</tbody>
      </table>`;
    const { gross, net, estVaR, largestWeight } = j.risk;
    Toast.open({ title:'Portfolio updated', description:`Gross ${gross.toFixed(2)}, Net ${net.toFixed(2)}, VaR~${estVaR.toFixed(2)}, Max pos ${(largestWeight*100).toFixed(1)}%`, variant:'info', timeoutMs:3000 });
  }

  root.querySelector('#alloc-refresh').addEventListener('click', load);
  await load();

  return { unmount(){ try{ root._ch1?.destroy(); root._ch2?.destroy(); } catch{} } };
}
