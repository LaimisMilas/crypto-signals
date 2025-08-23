/* eslint-env browser */
export async function mount(root){
  const list = document.createElement('ul');
  list.className = 'orders-list';
  root.appendChild(list);

  const qs = new URLSearchParams(location.search).toString();
  const es = new EventSource(`/live/orders-stream?${qs}`);
  const onMsg = (e)=>{
    const msg = JSON.parse(e.data);
    const li = document.createElement('li');
    li.textContent = `${msg.ts || ''} ${msg.symbol || ''} ${msg.side || ''} ${msg.qty || ''}`;
    list.prepend(li);
    while (list.children.length > 50) list.removeChild(list.lastChild);
  };
  es.onmessage = onMsg;

  return {
    unmount(){
      try { es.close(); } catch { /* ignore */ }
      root.innerHTML = '';
    }
  };
}
