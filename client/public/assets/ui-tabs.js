(function(){
  function parseDesiredTab() {
    const usp = new URLSearchParams(location.search);
    const q = usp.get('tab');
    if (q) return q;
    const m = location.hash.match(/tab=([\w-]+)/i);
    return m ? m[1] : null;
  }

  function setupTabs(root){
    const list = root.querySelector('[role="tablist"]');
    const tabs = Array.from(root.querySelectorAll('[role="tab"]'));
    const panels = Array.from(root.querySelectorAll('[role="tabpanel"]'));
    if (!list || tabs.length===0 || panels.length===0) return;

    const pageKey = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    const storageKey = `tabs:${pageKey}`;

    function activate(id, push=true){
      tabs.forEach(t=>{
        const is = t.dataset.tab === id;
        t.setAttribute('aria-selected', String(is));
        t.tabIndex = is ? 0 : -1;
      });
      panels.forEach(p=>{
        const is = p.dataset.tabPanel === id;
        if (is) p.removeAttribute('hidden'); else p.setAttribute('hidden','');
      });
      if (push) {
        try {
          const url = new URL(location.href);
          url.searchParams.set('tab', id);
          history.replaceState(null,'',url.toString());
          localStorage.setItem(storageKey, id);
        } catch {}
      }
      window.dispatchEvent(new CustomEvent('tabchange', { detail:{ id } }));
    }

    tabs.forEach(t=>{
      t.addEventListener('click', ()=> activate(t.dataset.tab));
      t.addEventListener('keydown', (e)=>{
        const i = tabs.indexOf(t);
        if (e.key==='ArrowRight') tabs[(i+1)%tabs.length].focus();
        if (e.key==='ArrowLeft')  tabs[(i-1+tabs.length)%tabs.length].focus();
        if (e.key==='Enter' || e.key===' ') activate(t.dataset.tab);
      });
    });

    const desired = parseDesiredTab() || localStorage.getItem(storageKey) || tabs[0].dataset.tab;
    activate(desired, /*push*/false);
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    document.querySelectorAll('.tabs[data-tabs]').forEach(setupTabs);
  });
})();
