(function () {
  const SEL_TABS = '.ui-tabs';
  const HOV_DELAY = 80;

  function parseDesiredTab() {
    const usp = new URLSearchParams(location.search);
    const q = usp.get('tab');
    if (q) return q;
    const m = location.hash.match(/tab=([\w-]+)/i);
    return m ? m[1] : null;
  }

  function setupTabs(root) {
    const tabs = Array.from(root.querySelectorAll('[role="tab"]'));
    const panels = tabs.map(t => document.getElementById(t.getAttribute('aria-controls')));
    if (tabs.length === 0 || panels.length === 0) return;

    const pageKey = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    const storageKey = `tabs:${pageKey}`;

    function activate(id, push = true) {
      tabs.forEach(t => {
        const is = t.getAttribute('aria-controls') === id;
        t.setAttribute('aria-selected', String(is));
        t.tabIndex = is ? 0 : -1;
      });
      panels.forEach(p => {
        const is = p.id === id;
        if (is) p.removeAttribute('hidden'); else p.setAttribute('hidden', '');
      });
      if (push) {
        try {
          const url = new URL(location.href);
          url.searchParams.set('tab', id);
          history.replaceState(null, '', url.toString());
          localStorage.setItem(storageKey, id);
        } catch {}
      }
      window.dispatchEvent(new CustomEvent('tabchange', { detail: { id } }));
    }

    tabs.forEach(t => {
      t.addEventListener('click', () => activate(t.getAttribute('aria-controls')));
      t.addEventListener('keydown', e => {
        const i = tabs.indexOf(t);
        if (e.key === 'ArrowRight') tabs[(i + 1) % tabs.length].focus();
        if (e.key === 'ArrowLeft') tabs[(i - 1 + tabs.length) % tabs.length].focus();
        if (e.key === 'Enter' || e.key === ' ') activate(t.getAttribute('aria-controls'));
      });
    });

    const desired = parseDesiredTab() || localStorage.getItem(storageKey) || tabs[0].getAttribute('aria-controls');
    activate(desired, false);
  }

  function enablePrefetch(root = document) {
    const links = root.querySelectorAll(`${SEL_TABS} [role="tab"][data-module], ${SEL_TABS} a[data-module]`);
    links.forEach((lnk) => {
      let timer = null;
      const doPrefetch = () => {
        const moduleName = lnk.getAttribute('data-module');
        const resource = lnk.getAttribute('data-prefetch-url') || null;
        if (moduleName && window.UILazy && typeof window.UILazy.prefetch === 'function') {
          window.UILazy.prefetch(moduleName, { resource });
        }
      };
      const onEnter = () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(doPrefetch, HOV_DELAY);
      };
      const onLeave = () => {
        if (timer) clearTimeout(timer);
      };
      lnk.addEventListener('mouseenter', onEnter);
      lnk.addEventListener('focus', onEnter);
      lnk.addEventListener('mouseleave', onLeave);
      lnk.addEventListener('blur', onLeave);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll(SEL_TABS).forEach(setupTabs);
    enablePrefetch();
  });
})();
