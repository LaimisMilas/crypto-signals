/* eslint-env browser */
(function(){
  const modCache = new Map();
  const instMap = new Map();

  async function loadModule(path){
    if (modCache.has(path)) return modCache.get(path);
    const m = await import(path);
    modCache.set(path, m);
    return m;
  }

  async function ensureVendor(url){
    if (document.querySelector(`script[data-vendor="${url}"]`)) return;
    await new Promise((res, rej)=>{
      const s = document.createElement('script');
      s.src = url; s.async = true; s.dataset.vendor = url;
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  function showSkeleton(panel, show){
    let sk = panel.querySelector('.lazy-skeleton');
    if (show && !sk){
      sk = document.createElement('div');
      sk.className = 'lazy-skeleton';
      sk.textContent = 'Loading…';
      sk.style.cssText = 'padding:12px;opacity:.7';
      panel.prepend(sk);
    }
    if (sk) sk.style.display = show ? '' : 'none';
  }

  async function mountPanel(panel){
    const path = panel.dataset.lazyModule;
    if (!path) return;
    if (instMap.has(panel)) return;

    const vendor = panel.dataset.lazyVendor;
    try {
      showSkeleton(panel, true);
      if (vendor) await ensureVendor(vendor);
      const mod = await loadModule(path);
      const ctx = { panel, path };
      const api = await mod.mount(panel, ctx);
      instMap.set(panel, { unmount: api?.unmount || (()=>{}), ctx });
    } finally {
      showSkeleton(panel, false);
    }
  }

  function unmountPanel(panel){
    const inst = instMap.get(panel);
    if (!inst) return;
    try { inst.unmount(); } catch(e) { console.warn('unmount error', e); }
    instMap.delete(panel);
  }

  function onTabChange(e){
    const id = e.detail?.id;
    if (!id) return;
    const root = document.querySelector('.tabs[data-tabs]');
    if (!root) return;
    const panels = Array.from(root.querySelectorAll('[role="tabpanel"]'));
    panels.forEach(p=>{
      const isActive = p.dataset.tabPanel === id && !p.hasAttribute('hidden');
      if (isActive) mountPanel(p); else unmountPanel(p);
    });
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    const panels = document.querySelectorAll('[role="tabpanel"]');
    panels.forEach(p=>{
      if (!p.hasAttribute('hidden')) mountPanel(p);
    });
  });

  window.addEventListener('tabchange', onTabChange);
})();
