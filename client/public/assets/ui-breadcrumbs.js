(function(){
  const PAGE_NAMES = {
    'index.html':'Home',
    'live.html':'Live',
    'analytics.html':'Analytics',
    'portfolio.html':'Portfolio',
    'settings.html':'Settings'
  };

  function buildCrumbs() {
    const host = document.getElementById('app-breadcrumbs');
    if (!host) return;
    const path = location.pathname.split('/').pop() || 'index.html';
    const pageName = PAGE_NAMES[path] || document.title || 'Page';
    const tabLabel = document.querySelector('[role="tab"][aria-selected="true"]')?.textContent?.trim();

    const parts = [
      { label:'Home', href:'/index.html' },
      ...(pageName !== 'Home' ? [{ label: pageName, href:`/${path}` }] : []),
      ...(tabLabel ? [{ label: tabLabel }] : [])
    ];

    host.innerHTML = parts.map((p,i)=>{
      const isLast = i === parts.length-1;
      const link = p.href && !isLast ? `<a href="${p.href}">${p.label}</a>` : `<span class="${isLast?'breadcrumbs__current':''}">${p.label}</span>`;
      const sep = isLast ? '' : `<span class="breadcrumbs__sep">›</span>`;
      return `${link}${sep}`;
    }).join('');
    if (tabLabel) document.title = `${tabLabel} — ${pageName} | Crypto Signals`;
  }

  document.addEventListener('DOMContentLoaded', buildCrumbs);
  window.addEventListener('tabchange', buildCrumbs);
})();
