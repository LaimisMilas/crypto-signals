/* eslint-env browser */
export async function mount(root){
  const links = [
    { href: '/walkforward.csv', label: 'Walkforward CSV' },
    { href: '/walkforward-agg.csv', label: 'Walkforward Agg CSV' }
  ];
  const ul = document.createElement('ul');
  links.forEach(l=>{
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = l.href;
    a.textContent = l.label;
    li.appendChild(a);
    ul.appendChild(li);
  });
  root.appendChild(ul);
  return { unmount(){ root.innerHTML = ''; } };
}
