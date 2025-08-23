/* eslint-env browser */
export async function mount(root){
  const resp = await fetch('/live/risk');
  const data = await resp.json();
  const pre = document.createElement('pre');
  pre.textContent = JSON.stringify(data, null, 2);
  root.appendChild(pre);
  return {
    unmount(){
      root.innerHTML = '';
    }
  };
}
