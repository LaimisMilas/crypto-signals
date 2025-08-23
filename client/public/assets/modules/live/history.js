/* eslint-env browser */
export async function mount(root){
  const resp = await fetch('/live/history');
  const data = await resp.json();
  const table = document.createElement('table');
  table.className = 'tbl';
  table.innerHTML = `<thead><tr>
    <th>Time</th><th>Symbol</th><th>Side</th><th>Qty</th><th>Entry</th><th>Exit</th><th>PnL</th>
  </tr></thead><tbody></tbody>`;
  const tb = table.querySelector('tbody');
  (data.closedTrades||[]).forEach(t=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${new Date(t.closed_at).toLocaleString()}</td>
      <td>${t.symbol}</td><td>${t.side}</td><td>${t.qty}</td>
      <td>${t.entry_price}</td><td>${t.exit_price}</td><td>${t.pnl}</td>`;
    tb.appendChild(tr);
  });
  root.appendChild(table);

  return { unmount(){ root.innerHTML = ''; } };
}
