/* eslint-env browser */
export async function mount(root){
  root.innerHTML = `<div style="display:flex;gap:8px;align-items:center"><label>Window (days)
    <input id="corr-window" type="number" min="5" max="120" value="30" style="width:80px"></label>
    <button id="corr-load" class="btn">Load</button>
  </div>
  <div id="corr-heat" style="margin-top:12px;overflow:auto"></div>`;

  async function load(){
    const w = Number(root.querySelector('#corr-window').value||30);
    const j = await fetch(`/portfolio/correlation?window=${w}`).then(r=>r.json());
    const { symbols, matrix } = j;

    if (!symbols.length){ root.querySelector('#corr-heat').innerHTML = '<div style="opacity:.7">No data</div>'; return; }

    const tblHead = `<tr><th></th>${symbols.map(s=>`<th>${s}</th>`).join('')}</tr>`;
    const rows = symbols.map((s,i)=>{
      const tds = symbols.map((_,j)=>{
        const v = matrix[i][j];
        const c = v==null? '#111' : (v>=0 ? `rgba(6,214,160,${Math.abs(v)})` : `rgba(239,71,111,${Math.abs(v)})`);
        const txt = v==null? '' : v.toFixed(2);
        return `<td style="background:${c};text-align:center">${txt}</td>`;
      }).join('');
      return `<tr><th>${s}</th>${tds}</tr>`;
    }).join('');
    root.querySelector('#corr-heat').innerHTML = `<table class="tbl">${tblHead}${rows}</table>`;
  }

  root.querySelector('#corr-load').addEventListener('click', load);
  await load();
  return { unmount(){} };
}
