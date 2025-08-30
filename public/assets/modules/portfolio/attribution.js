/* eslint-env browser */
export async function mount(root){
  root.innerHTML = `<div style="display:flex;gap:8px;align-items:end;flex-wrap:wrap">
    <label>From <input id="attr-from" type="date"></label>
    <label>To <input id="attr-to" type="date"></label>
    <label>Group by
      <select id="attr-group">
        <option value="symbol">Symbol</option>
        <option value="strategy">Strategy</option>
      </select>
    </label>
    <button id="attr-load" class="btn">Load</button>
  </div>
  <div style="margin-top:12px"><canvas id="attr-bar" height="300"></canvas></div>`;

  const Chart = window.Chart;
  const ctx = root.querySelector('#attr-bar').getContext('2d');

  function toISODate(d){ return new Date(d).toISOString().slice(0,10); }
  const today = new Date(); const from = new Date(today.getTime()-30*24*3600*1000);
  root.querySelector('#attr-from').value = toISODate(from);
  root.querySelector('#attr-to').value   = toISODate(today);

  async function load(){
    const f = root.querySelector('#attr-from').value;
    const t = root.querySelector('#attr-to').value;
    const g = root.querySelector('#attr-group').value;
    const qs = new URLSearchParams({ from: new Date(f).toISOString(), to: new Date(t).toISOString(), groupBy: g });
    const j = await fetch(`/portfolio/attribution?${qs}`).then(r=>r.json());

    const labels = j.items.map(x=>x.key);
    const data = j.items.map(x=>Number(x.pnl||0));
    if (root._bar) root._bar.destroy();
    root._bar = new Chart(ctx, {
      type:'bar',
      data:{ labels, datasets:[{ label:`P&L by ${j.groupBy}`, data }] },
      options:{ plugins:{ legend:{ display:false } } }
    });
  }

  root.querySelector('#attr-load').addEventListener('click', load);
  await load();
  return { unmount(){ try{ root._bar?.destroy(); }catch{} } };
}
