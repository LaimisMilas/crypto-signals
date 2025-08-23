/* eslint-env browser */
export async function mount(root){
  const resp = await fetch('/analytics/trades');
  const data = await resp.json();
  const table = document.createElement('table');
  table.className = 'tbl';
  table.innerHTML = `<thead><tr>
    <th>Time</th><th>Symbol</th><th>Side</th><th>Qty</th><th>Price</th>
  </tr></thead><tbody></tbody>`;
  const tb = table.querySelector('tbody');
  (data.trades||[]).forEach(t=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${new Date(t.time).toLocaleString()}</td>
      <td>${t.symbol}</td><td>${t.side}</td><td>${t.qty}</td><td>${t.price}</td>`;
    tb.appendChild(tr);
  });
  root.appendChild(table);
  return { unmount(){ root.innerHTML = ''; } };
}
