(function () {
  const PAGE_NAMES = {
    'index.html': 'Home',
    'live.html': 'Live',
    'analytics.html': 'Analytics',
    'portfolio.html': 'Portfolio',
    'settings.html': 'Settings'
  };
  const SEL_NAV = '.ui-breadcrumbs';
  const SEL_LIST = '.ui-breadcrumbs-list';
  const JSONLD_ID = 'breadcrumbs-jsonld';

  function buildCrumbs(navEl) {
    const list = navEl.querySelector(SEL_LIST);
    if (!list) return;
    const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    const pageName = PAGE_NAMES[path] || document.title || 'Page';
    const tabLabel = document.querySelector('[role="tab"][aria-selected="true"]')?.textContent?.trim();

    const parts = [
      { label: 'Home', href: '/index.html' },
      ...(pageName !== 'Home' ? [{ label: pageName, href: `/${path}` }] : []),
      ...(tabLabel ? [{ label: tabLabel, current: true }] : [])
    ];

    list.innerHTML = '';
    parts.forEach((p, idx) => {
      const li = document.createElement('li');
      if (p.current || idx === parts.length - 1) {
        li.textContent = p.label;
        li.setAttribute('aria-current', 'page');
      } else {
        const a = document.createElement('a');
        a.href = p.href;
        a.textContent = p.label;
        li.appendChild(a);
      }
      list.appendChild(li);
    });
  }

  function buildJsonLd(items, baseHref) {
    const itemListElements = items.map((it, idx) => {
      const name = it.textContent.trim();
      let itemUrl = it.getAttribute('href') || '';
      if (itemUrl && baseHref && itemUrl.startsWith('/')) {
        itemUrl = new URL(itemUrl, baseHref).toString();
      }
      return {
        '@type': 'ListItem',
        position: idx + 1,
        name,
        ...(itemUrl ? { item: itemUrl } : {})
      };
    });

    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: itemListElements
    };
  }

  function injectJsonLd(navEl) {
    const old = navEl.querySelector(`#${JSONLD_ID}`);
    if (old) old.remove();

    const baseAttr = navEl.getAttribute('data-bc-base');
    if (baseAttr === 'disable') return;
    const base = baseAttr || location.origin;
    const list = navEl.querySelector(SEL_LIST);
    if (!list) return;

    const links = Array.from(list.querySelectorAll('li > a'));
    const current = list.querySelector('li[aria-current="page"]');
    const items = links.concat(current ? [current] : []);
    if (!items.length) return;

    const data = buildJsonLd(items, base);
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = JSONLD_ID;
    script.textContent = JSON.stringify(data);
    navEl.appendChild(script);
  }

  function syncDocumentTitle(navEl) {
    const current = navEl.querySelector('li[aria-current="page"]');
    if (current) {
      const bc = Array.from(navEl.querySelectorAll('li'))
        .map(li => li.textContent.trim())
        .filter(Boolean);
      document.title = bc.join(' → ');
    }
  }

  function init() {
    const nav = document.querySelector(SEL_NAV);
    if (!nav) return;
    buildCrumbs(nav);
    injectJsonLd(nav);
    syncDocumentTitle(nav);
  }

  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('tabchange', init);
})();
